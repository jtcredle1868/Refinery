"""Tests for Settings config and model imports required for init_db."""
import pytest


def test_settings_loads():
    from app.config import get_settings
    s = get_settings()
    assert s.APP_NAME == "Refinery"
    assert s.API_PREFIX == "/api/v1"
    assert s.DB_POOL_SIZE == 5
    assert s.DB_MAX_OVERFLOW == 10
    assert s.CLAUDE_MODEL == "claude-sonnet-4-6"


def test_all_models_importable():
    """All ORM models must be importable (needed for Base.metadata.create_all)."""
    from app.models.user import User, UserTier
    from app.models.manuscript import Manuscript, ManuscriptStatus
    from app.models.analysis import AnalysisResult, AnalysisType, AnalysisStatus
    from app.models.enterprise import (
        Organization, OrgMembership, EnterpriseRole,
        Annotation, ManuscriptDecision, AdvisorAssignment, InvitationCode,
    )
    from app.core.database import Base

    table_names = set(Base.metadata.tables.keys())
    required = {
        "users", "manuscripts", "analysis_results",
        "organizations", "org_memberships", "annotations",
        "manuscript_decisions", "advisor_assignments", "invitation_codes",
    }
    missing = required - table_names
    assert not missing, f"Tables not registered with Base.metadata: {missing}"


def test_user_tier_enum():
    from app.models.user import UserTier
    assert UserTier.FREE.value == "free"
    assert UserTier.PRO.value == "pro"
    assert UserTier.ENTERPRISE.value == "enterprise"


def test_analysis_type_enum():
    from app.models.analysis import AnalysisType
    assert AnalysisType.XRAY.value == "xray"
    assert AnalysisType.INTELLIGENCE_ENGINE.value == "intelligence_engine"
