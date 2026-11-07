# AI Provider setup flow

## Summary

- Add OpenAI as a native BYOK provider. Requests go directly from the browser to OpenAI using the user's API key.
- Reorganize AI Provider into a guided two-step flow: choose a provider, then configure it.
- Keep the existing Gemini, Local WebLLM, AWS Bedrock, and Offline options.
- Keep the OpenAI key in session memory by default; “Lembrar neste dispositivo” opts into local browser storage.
- Validate OpenAI credentials with `GET /v1/models`, map provider errors, and validate structured architecture/Terraform responses before applying them.

## Validation

- ESLint passed.
- TypeScript check passed.
- 15 OpenAI provider tests passed.
- Production build passed; existing PWA cache-size and missing Upstash configuration warnings remain.

## Security notes

- No server proxy or environment variable is used for the OpenAI key.
- Browser storage is not a secure vault. Use a dedicated API key with minimum permissions and spending limits.

## Screenshots

### Provider selection

![AI Provider — escolha do provider](./01-provider-selection.png)

### OpenAI configuration

![AI Provider — configuração OpenAI](./02-openai-configuration.png)

### Gemini Cloud configuration

![AI Provider — configuração Gemini Cloud](./03-gemini-configuration.png)

### Local WebLLM

![AI Provider — opção Local WebLLM](./04-weblm-configuration.png)

### AWS Bedrock

![AI Provider — opção AWS Bedrock](./05-bedrock-configuration.png)

### AWS Bedrock authentication

![AWS Bedrock — configuração de autenticação](./06-bedrock-auth.png)

### AWS Bedrock access keys

![AWS Bedrock — configuração com access keys](./07-bedrock-access-keys.png)
