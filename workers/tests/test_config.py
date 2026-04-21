"""Tests for workers.config.validate_config (PRD c §5.7)."""

import logging

import pytest

import config as config_module
from config import validate_config


@pytest.fixture
def valid_env(monkeypatch):
    """Set all required env vars to valid values for the module-level constants."""
    monkeypatch.setattr(config_module, "SUPABASE_URL", "http://localhost:54321")
    monkeypatch.setattr(config_module, "SUPABASE_SERVICE_ROLE_KEY", "service-role-key")
    monkeypatch.setattr(config_module, "OPENAI_API_KEY", "sk-test-abcdef")
    monkeypatch.setattr(config_module, "REDIS_URL", "redis://localhost:6379")


def test_validate_config_passes_when_all_present(valid_env):
    """All required secrets present → no exception, no exit."""
    validate_config()  # should not raise


def test_validate_config_exits_when_openai_api_key_missing(valid_env, monkeypatch, caplog):
    """Missing OPENAI_API_KEY → SystemExit(1) with CRITICAL log naming it."""
    monkeypatch.setattr(config_module, "OPENAI_API_KEY", None)

    with caplog.at_level(logging.CRITICAL):
        with pytest.raises(SystemExit) as exc_info:
            validate_config()

    assert exc_info.value.code == 1
    critical_records = [r for r in caplog.records if r.levelno == logging.CRITICAL]
    assert len(critical_records) == 1
    assert "OPENAI_API_KEY" in critical_records[0].message


def test_validate_config_names_all_missing_in_single_message(valid_env, monkeypatch, caplog):
    """Multiple missing vars → one CRITICAL message naming every one."""
    monkeypatch.setattr(config_module, "OPENAI_API_KEY", None)
    monkeypatch.setattr(config_module, "SUPABASE_SERVICE_ROLE_KEY", "")

    with caplog.at_level(logging.CRITICAL):
        with pytest.raises(SystemExit):
            validate_config()

    critical_records = [r for r in caplog.records if r.levelno == logging.CRITICAL]
    assert len(critical_records) == 1
    message = critical_records[0].message
    assert "OPENAI_API_KEY" in message
    assert "SUPABASE_SERVICE_ROLE_KEY" in message


def test_validate_config_rejects_invalid_url(valid_env, monkeypatch, caplog):
    """URL-shaped var with no scheme → SystemExit(1) with that var named."""
    monkeypatch.setattr(config_module, "SUPABASE_URL", "not-a-url")

    with caplog.at_level(logging.CRITICAL):
        with pytest.raises(SystemExit):
            validate_config()

    critical_records = [r for r in caplog.records if r.levelno == logging.CRITICAL]
    assert len(critical_records) == 1
    assert "SUPABASE_URL" in critical_records[0].message


def test_validate_config_rejects_empty_string(valid_env, monkeypatch, caplog):
    """Empty string is treated the same as missing."""
    monkeypatch.setattr(config_module, "SUPABASE_SERVICE_ROLE_KEY", "")

    with caplog.at_level(logging.CRITICAL):
        with pytest.raises(SystemExit):
            validate_config()

    assert any("SUPABASE_SERVICE_ROLE_KEY" in r.message for r in caplog.records)


def test_validate_config_accepts_whitespace_only_as_empty(valid_env, monkeypatch, caplog):
    """Whitespace-only is treated as empty — deploys that set `KEY= ` fail at boot."""
    monkeypatch.setattr(config_module, "OPENAI_API_KEY", "   ")

    with caplog.at_level(logging.CRITICAL):
        with pytest.raises(SystemExit):
            validate_config()

    assert any("OPENAI_API_KEY" in r.message for r in caplog.records)
