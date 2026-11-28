# Private send devnet experiment (Helius Privacy Rings)

Devnet only, test funds only. Not wired into the web app.

1. Node 24+ (the SDK requires it). `npm install`.
2. Copy `.env.example` to `.env`, set `API_KEY` (Helius devnet key) and `ZOLANA_PAYER_KEYPAIR` (a throwaway devnet keypair funded with devnet SOL). Never commit `.env`.
3. `npx tsx --env-file=.env src/demo.ts`
4. Open the three explorer links and record what is visible (addresses, asset, amount).

Findings so far come from Helius docs: deposit and withdraw reveal sender, recipient, asset and amount; a default-ring private transfer hides asset and amount only, and the recipient must be a shielded address, not a plain Solana address.
