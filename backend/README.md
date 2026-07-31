# FinTech Backend - Bank-Grade Security

## Security Features Implemented

✅ **Token Lifecycle**
- 15-minute access tokens
- 7-day refresh tokens
- Token revocation store
- Device binding enforcement

✅ **Idempotency**
- Prevents duplicate transactions
- 24-hour idempotency window

✅ **Immutable Audit**
- Hash-chained event store
- Tamper-evident logging
- Never deletable

✅ **Consent Management**
- GDPR/RBI compliant
- Version tracking
- Enforced before actions

✅ **Field Encryption**
- PII encrypted at field level
- Fernet encryption (AES-128)
```

4. **Run server**:
```bash
python main.py
```

## API Usage

### Authentication
```bash
# All protected endpoints require:
Authorization: Bearer <access_token>
X-Device-ID: <device_fingerprint>
```

### Idempotency
```bash
# Financial operations require:
Idempotency-Key: <unique_key>
```

## Production Deployment

1. **Replace secrets management**:
   - Use AWS Secrets Manager / GCP Secret Manager
   - Update `infra/secrets.py`

2. **Configure MongoDB**:
   - Enable encryption at rest
   - Set up replica set
   - Configure backups

3. **Enable HTTPS**:
   - Use reverse proxy (nginx)
   - Configure SSL certificates

4. **Set up monitoring**:
   - Application logs
   - Audit log monitoring
   - Security alerts

## Security Checklist

- [ ] JWT_SECRET rotated
- [ ] FERNET_KEY generated securely
- [ ] MongoDB authentication enabled
- [ ] HTTPS enforced
- [ ] Secrets in vault
- [ ] Audit collection set to append-only
- [ ] Rate limits configured
- [ ] CORS configured properly
