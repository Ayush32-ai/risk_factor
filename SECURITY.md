# Security Guidelines

## API Key Management

### Environment Variables
- **NEVER** commit API keys to version control
- Store sensitive keys in `.env` file (already in `.gitignore`)
- Use different API keys for different environments (dev/staging/prod)

### Current API Keys
- `GROK_API_KEY`: Used for AI risk assessments and investigations
- `JWT_SECRET`: Used for authentication token signing
- `DATABASE_URL`: Contains database credentials
- `NEO4J_PASSWORD`: Graph database password

### Security Measures Implemented
1. **Environment Variable Protection**: All sensitive data stored in `.env`
2. **Gitignore Protection**: `.env` files excluded from version control
3. **No Exposure Endpoints**: No API endpoints expose configuration or keys
4. **Secure Client Design**: API keys only used internally, never sent to frontend
5. **CORS Configuration**: Restricted to specific origins
6. **Rate Limiting**: Prevents API abuse
7. **Helmet Security Headers**: Standard web security headers applied

### Best Practices
- Rotate API keys regularly
- Use least-privilege access for database users
- Monitor API usage and set up alerts for unusual activity
- Use HTTPS in production
- Implement proper logging without exposing sensitive data

### Production Deployment
- Use environment-specific configuration
- Enable database SSL/TLS
- Set up proper firewall rules
- Use secrets management service (AWS Secrets Manager, Azure Key Vault, etc.)
- Enable audit logging
- Set up monitoring and alerting