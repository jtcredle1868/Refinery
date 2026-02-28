"""Stripe payment integration routes — subscription management.

SCAFFOLD: This module is fully coded but requires a Stripe account
and API keys to function. Set STRIPE_SECRET_KEY and
STRIPE_WEBHOOK_SECRET in your .env file.
"""
import json
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserTier
from app.config import get_settings

router = APIRouter(prefix="/payments", tags=["payments"])
settings = get_settings()

# Price IDs — set these to your actual Stripe price IDs
PRICE_MAP = {
    "indie_pro_monthly": "price_indie_pro_monthly",        # $29/mo
    "indie_pro_annual": "price_indie_pro_annual",           # $290/yr
    "academic_monthly": "price_academic_monthly",           # $19/mo
    "academic_annual": "price_academic_annual",             # $190/yr
    "enterprise_monthly": "price_enterprise_monthly",       # Custom
}

TIER_FROM_PRICE = {
    "price_indie_pro_monthly": UserTier.PRO,
    "price_indie_pro_annual": UserTier.PRO,
    "price_academic_monthly": UserTier.ACADEMIC,
    "price_academic_annual": UserTier.ACADEMIC,
    "price_enterprise_monthly": UserTier.ENTERPRISE,
}


def _get_stripe():
    """Lazy-load stripe to avoid import errors if not installed."""
    try:
        import stripe
        stripe.api_key = getattr(settings, "STRIPE_SECRET_KEY", "")
        if not stripe.api_key:
            raise HTTPException(
                status_code=503,
                detail="Stripe is not configured. Set STRIPE_SECRET_KEY in your .env file.",
            )
        return stripe
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="Stripe SDK not installed. Run: pip install stripe",
        )


# ---------------------------------------------------------------------------
# Checkout
# ---------------------------------------------------------------------------

class CreateCheckoutRequest(BaseModel):
    price_id: str  # e.g., "indie_pro_monthly"
    success_url: str = "http://localhost:3000/?checkout=success"
    cancel_url: str = "http://localhost:3000/?checkout=cancel"


@router.post("/create-checkout-session")
async def create_checkout_session(
    request: CreateCheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a Stripe Checkout session for subscription."""
    stripe = _get_stripe()

    price_id = PRICE_MAP.get(request.price_id, request.price_id)

    # Create or retrieve Stripe customer
    if not current_user.stripe_customer_id:
        customer = stripe.Customer.create(
            email=current_user.email,
            name=current_user.full_name,
            metadata={"refinery_user_id": str(current_user.id)},
        )
        current_user.stripe_customer_id = customer.id
        db.add(current_user)
        await db.flush()
    else:
        customer_id = current_user.stripe_customer_id

    session = stripe.checkout.Session.create(
        customer=current_user.stripe_customer_id,
        payment_method_types=["card"],
        line_items=[{"price": price_id, "quantity": 1}],
        mode="subscription",
        success_url=request.success_url,
        cancel_url=request.cancel_url,
        metadata={"refinery_user_id": str(current_user.id)},
    )

    return {"checkout_url": session.url, "session_id": session.id}


# ---------------------------------------------------------------------------
# Customer Portal
# ---------------------------------------------------------------------------

@router.post("/create-portal-session")
async def create_portal_session(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a Stripe Customer Portal session for managing subscriptions."""
    stripe = _get_stripe()

    if not current_user.stripe_customer_id:
        raise HTTPException(status_code=400, detail="No Stripe customer found. Subscribe first.")

    session = stripe.billing_portal.Session.create(
        customer=current_user.stripe_customer_id,
        return_url="http://localhost:3000/",
    )

    return {"portal_url": session.url}


# ---------------------------------------------------------------------------
# Subscription Status
# ---------------------------------------------------------------------------

@router.get("/subscription")
async def get_subscription_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current subscription status."""
    stripe = _get_stripe()

    if not current_user.stripe_customer_id:
        return {
            "status": "none",
            "tier": current_user.tier.value,
            "message": "No active subscription. You are on the Free tier.",
        }

    subscriptions = stripe.Subscription.list(
        customer=current_user.stripe_customer_id,
        status="active",
        limit=1,
    )

    if not subscriptions.data:
        return {
            "status": "inactive",
            "tier": current_user.tier.value,
            "message": "No active subscription found.",
        }

    sub = subscriptions.data[0]
    return {
        "status": sub.status,
        "tier": current_user.tier.value,
        "subscription_id": sub.id,
        "current_period_end": sub.current_period_end,
        "cancel_at_period_end": sub.cancel_at_period_end,
        "price_id": sub["items"]["data"][0]["price"]["id"] if sub["items"]["data"] else None,
    }


# ---------------------------------------------------------------------------
# Webhook Handler
# ---------------------------------------------------------------------------

@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Handle Stripe webhook events for subscription lifecycle."""
    stripe = _get_stripe()

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    webhook_secret = getattr(settings, "STRIPE_WEBHOOK_SECRET", "")

    if not webhook_secret:
        raise HTTPException(status_code=503, detail="Stripe webhook secret not configured.")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Handle relevant events
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session.get("metadata", {}).get("refinery_user_id")
        subscription_id = session.get("subscription")

        if user_id and subscription_id:
            result = await db.execute(select(User).where(User.id == int(user_id)))
            user = result.scalar_one_or_none()
            if user:
                user.stripe_subscription_id = subscription_id

                # Get subscription to determine tier
                sub = stripe.Subscription.retrieve(subscription_id)
                price_id = sub["items"]["data"][0]["price"]["id"] if sub["items"]["data"] else None
                new_tier = TIER_FROM_PRICE.get(price_id, UserTier.PRO)
                user.tier = new_tier
                db.add(user)

    elif event["type"] == "customer.subscription.updated":
        sub = event["data"]["object"]
        customer_id = sub.get("customer")

        result = await db.execute(
            select(User).where(User.stripe_customer_id == customer_id)
        )
        user = result.scalar_one_or_none()
        if user:
            if sub["status"] == "active":
                price_id = sub["items"]["data"][0]["price"]["id"] if sub["items"]["data"] else None
                new_tier = TIER_FROM_PRICE.get(price_id, UserTier.PRO)
                user.tier = new_tier
            elif sub["status"] in ("canceled", "unpaid", "past_due"):
                user.tier = UserTier.FREE
                user.stripe_subscription_id = None
            db.add(user)

    elif event["type"] == "customer.subscription.deleted":
        sub = event["data"]["object"]
        customer_id = sub.get("customer")

        result = await db.execute(
            select(User).where(User.stripe_customer_id == customer_id)
        )
        user = result.scalar_one_or_none()
        if user:
            user.tier = UserTier.FREE
            user.stripe_subscription_id = None
            db.add(user)

    return {"received": True}
