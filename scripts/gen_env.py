#!/usr/bin/env python3
import argparse
import base64
import hmac
import hashlib
import json
import os
import secrets
import sys
import time


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def jwt_encode(payload: dict, secret: str) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    header_b64 = b64url(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_b64 = b64url(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    signature = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    return f"{header_b64}.{payload_b64}.{b64url(signature)}"


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate a .env file for local Supabase compose.")
    parser.add_argument("--output", default=".env", help="Path to output env file")
    parser.add_argument(
        "--write-web-env",
        action="store_true",
        help="Also write apps/web/.env.local for the frontend",
    )
    parser.add_argument(
        "--web-output",
        default="apps/web/.env.local",
        help="Path to output web env file",
    )
    parser.add_argument("--force", action="store_true", help="Overwrite if the file exists")
    args = parser.parse_args()

    if os.path.exists(args.output) and not args.force:
        print(f"Refusing to overwrite existing file: {args.output}", file=sys.stderr)
        print("Use --force to overwrite.", file=sys.stderr)
        return 1

    jwt_secret = secrets.token_hex(32)
    db_enc_key = b64url(os.urandom(32))
    secret_key_base = b64url(os.urandom(64))
    pg_meta_crypto_key = secrets.token_hex(16)

    iat = int(time.time())
    exp = iat + 60 * 60 * 24 * 365 * 10

    anon_payload = {"role": "anon", "iss": "supabase", "iat": iat, "exp": exp}
    service_payload = {"role": "service_role", "iss": "supabase", "iat": iat, "exp": exp}

    anon_key = jwt_encode(anon_payload, jwt_secret)
    service_role_key = jwt_encode(service_payload, jwt_secret)

    postgres_password = secrets.token_urlsafe(16)
    n8n_password = secrets.token_urlsafe(16)

    lines = [
        "# Database",
        "POSTGRES_USER=supabase_admin",
        f"POSTGRES_PASSWORD={postgres_password}",
        "POSTGRES_DB=postgres",
        "",
        "# Supabase auth",
        f"JWT_SECRET={jwt_secret}",
        "JWT_EXPIRY=3600",
        f"DB_ENC_KEY={db_enc_key}",
        f"SECRET_KEY_BASE={secret_key_base}",
        f"ANON_KEY={anon_key}",
        f"SERVICE_ROLE_KEY={service_role_key}",
        "API_EXTERNAL_URL=http://localhost:8000",
        "GOTRUE_SITE_URL=http://localhost:3000",
        "GOTRUE_URI_ALLOW_LIST=http://localhost:3000",
        "GOTRUE_DISABLE_SIGNUP=true",
        "GOTRUE_MAILER_AUTOCONFIRM=true",
        "",
        "# Studio / Meta",
        f"PG_META_CRYPTO_KEY={pg_meta_crypto_key}",
        "SUPABASE_PUBLIC_URL=http://localhost:8000",
        "STUDIO_DEFAULT_ORGANIZATION=Default Organization",
        "STUDIO_DEFAULT_PROJECT=Projeto Dindin",
        "LOGFLARE_URL=http://analytics:4000",
        f"LOGFLARE_PRIVATE_ACCESS_TOKEN={secrets.token_hex(16)}",
        "",
        "# SMTP (opcional, para email)",
        "SMTP_HOST=",
        "SMTP_PORT=587",
        "SMTP_USER=",
        "SMTP_PASS=",
        "SMTP_ADMIN_EMAIL=admin@example.com",
        "SMTP_SENDER_NAME=Projeto Dindin",
        "",
        "# n8n",
        "N8N_BASIC_AUTH_USER=admin",
        f"N8N_BASIC_AUTH_PASSWORD={n8n_password}",
        "",
        "# OFX service",
        "OFX_PORT=7071",
        "",
    ]

    with open(args.output, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"Wrote {args.output}. Keep it safe.")

    if args.write_web_env:
        web_output = args.web_output
        if os.path.exists(web_output) and not args.force:
            print(f"Refusing to overwrite existing file: {web_output}", file=sys.stderr)
            print("Use --force to overwrite.", file=sys.stderr)
            return 1

        os.makedirs(os.path.dirname(web_output), exist_ok=True)
        web_lines = [
            "NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000",
            f"NEXT_PUBLIC_SUPABASE_ANON_KEY={anon_key}",
        ]
        with open(web_output, "w", encoding="utf-8") as f:
            f.write("\n".join(web_lines))
        print(f"Wrote {web_output}. Keep it safe.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
