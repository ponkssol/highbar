/** Known SOL tip accounts of transaction-landing services (Jito, Helius Sender, Nozomi, Lunar Lander, ...), keyed by provider.
 *  A system transfer (top-level or inner) from a signer to one of these is a TIP in the per-trade cost breakdown (indexer/txCosts.ts).
 *
 *  Sources (copied verbatim, public on-chain addresses only):
 *   - sol-parser-sdk 0.10.0 src/transaction_cost.rs  https://docs.rs/crate/sol-parser-sdk/0.10.0/source/src/transaction_cost.rs
 *   - sol-trade-sdk 10.0.0 src/constants/swqos.rs     https://docs.rs/crate/sol-trade-sdk/10.0.0/source/src/constants/swqos.rs
 *     (both lists are identical for every provider below)
 *   - Jito: https://docs.jito.wtf/lowlatencytxnsend/ (getTipAccounts)
 *   - Hello Moon Lunar Lander: https://docs.hellomoon.io/reference/lunar-lander (moonBtH9... is one of its tip wallets)
 *
 *  UNKNOWN_TIP_ACCOUNTS: wallets seen receiving a flat SOL transfer next to a sniper swap whose operator is not identified.
 *  They are reported as provider 'unknown-tip' so the money is visible, never silently dropped.
 *   - DSAiWuoci5RNZ7skPotJsL987YaWg7bTGwAYugZV97Kx: not in any list above. In the reference sniper tx it received exactly 0.85% of the
 *     3.5 SOL buy (0.02975 SOL), which looks like a trading-bot / terminal fee wallet rather than a validator tip. Kept as 'unknown-tip'.
 *  Add providers here (one array per provider); tests assert every entry is a valid base58 pubkey and no address maps to two providers. */
export type TipProvider = string;
export const UNKNOWN_TIP: TipProvider = "unknown-tip";

export const TIP_ACCOUNTS: Record<TipProvider, readonly string[]> = {
  // Jito block engine (also docs.jito.wtf: getTipAccounts)
  "jito": [
    "3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT",
    "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5",
    "ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49",
    "ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt",
    "Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY",
    "DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh",
    "DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL",
    "HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe",
  ],
  // Helius Sender
  "helius-sender": [
    "2nyhqdwKcJZR2vcqCyrYsaPVdAnFoJjiksCXJ7hfEYgD",
    "2q5pghRs6arqVjRvT5gfgWfWcHWmw1ZuCzphgd5KfWGJ",
    "3KCKozbAaF75qEU33jtzozcJ29yJuaLJTy2jFdzUY8bT",
    "4ACfpUFoaSD9bfPdeu6DBt89gB6ENTeHBXCAi87NhDEE",
    "4TQLFNWK8AovT1gFvda5jfw2oJeRMKEmw7aH6MGBJ3or",
    "4vieeGHPYPG2MmyPRcYjdiDmmhN3ww7hsFNap8pVN3Ey",
    "5VY91ws6B2hMmBFRsXkoAAdsPHBJwRfBht4DXox3xkwn",
    "9bnz4RShgq1hAnLnZbP8kbgBg1kEmcJBYQq3gQbmnSta",
    "D2L6yPZ2FmmmTKPgzaMKdhu6EWZcTpLy1Vhx8uvZe7NZ",
    "wyvPkWjVZz1M8fHQnMMCDTQDbkManefNNhweYk5WkcF",
  ],
  // NextBlock
  "nextblock": [
    "NEXTbLoCkB51HpLBLojQfpyVAMorm3zzKg7w9NFdqid",
    "NeXTBLoCKs9F1y5PJS9CKrFNNLU1keHW71rfh7KgA1X",
    "NexTBLockJYZ7QD7p2byrUa6df8ndV2WSd8GkbWqfbb",
    "NexTbLoCkWykbLuB1NkjXgFWkX9oAtcoagQegygXXA2",
    "NextbLoCkVtMGcV47JzewQdvBpLqT9TxQFozQkN98pE",
    "nEXTBLockYgngeRmRrjDV31mGSekVPqZoMGhQEZtPVG",
    "neXtBLock1LeC67jYd1QdAa32kbVeubsfPNTJC1V5At",
    "nextBLoCkPMgmG8ZgJtABeScP35qLa2AMCNKntAP7Xc",
  ],
  // 0slot
  "0slot": [
    "6rYLG55Q9RpsPGvqdPNJs4z5WTxJVatMB8zV3WJhs5EK",
    "Cix2bHfqPcKcM233mzxbLk14kSggUUiz2A87fJtGivXr",
    "ENxTEjSQ1YabmUpXAdCgevnHQ9MHdLv8tzFiuiYJqa13",
    "Eb2KpSC8uMt9GmzyAEm5Eb1AAAgTjRaXWFjKyFXHZxF3",
    "FCjUJZ1qozm1e8romw216qyfQMaaWKxWsuySnumVCCNe",
  ],
  // Temporal Nozomi
  "nozomi": [
    "TEMPaMeCRFAS9EKF53Jd6KpHxgL47uWLcpFArU1Fanq",
    "noz3jAjPiHuBPqiSPkkugaJDkJscPuRhYnSpbi8UvC4",
    "noz3str9KXfpKknefHji8L1mPgimezaiUyCHYMDv1GE",
    "noz6uoYCDijhu1V7cutCpwxNiSovEwLdRHPwmgCGDNo",
    "noz9EPNcT7WH6Sou3sr3GGjHQYVkN3DNirpbvDkv9YJ",
    "nozFrhfnNGoyqwVuwPAW4aaGqempx4PU6g6D9CJMv7Z",
    "nozNVWs5N8mgzuD3qigrCG2UoKxZttxzZ85pvAQVrbP",
    "nozUacTVWub3cL4mJmGCYjKZTnE9RbdY5AP46iQgbPJ",
    "nozWCyTPppJjRuw2fpzDhhWbW355fzosWSzrrMYB1Qk",
    "nozWNju6dY353eMkMqURqwQEoM3SFgEKC6psLCSfUne",
    "nozc5yT15LazbLTFVZzoNZCwjh3yUtW86LoUyqsBu4L",
    "nozievPk7HyK1Rqy1MPJwVQ7qQg2QoJGyP71oeDwbsu",
    "noznbgwYnBLDHu8wcQVCEw6kDrXkPdKkydGJGNXGvL7",
    "nozpEGbwx4BcGp6pvEdAh1JoC2CQGZdU6HbNP1v2p6P",
    "nozrhjhkCr3zXT3BiT4WCodYCUFeQvcdUkM7MqhKqge",
    "nozrwQtWhEdrA6W8dkbt9gnUaMs52PdAv5byipnadq3",
    "nozxNBgWohjR75vdspfxR5H9ceC7XXH99xpxhVGt3Bb",
  ],
  // bloXroute
  "bloxroute": [
    "3UQUKjhMKaY2S6bjcQD6yHB7utcZt5bfarRCmctpRtUd",
    "95cfoy472fcQHaw4tPGBTKpn6ZQnfEPfBgDQx6gcRmRg",
    "FogxVNs6Mm2w9rnGL1vkARSwJxvLE8mujTv3LK8RnUhF",
    "HWEoBxYs7ssKuudEjzjmpfJVX7Dvi7wescFsVx2L5yoY",
  ],
  // Node1
  "node1": [
    "node1AyMbeqiVN6eoQzEAwCA6Pk826hrdqdAHR7cdJ3",
    "node1PUber6SFmSQgvf2ECmXsHP5o3boRSGhvJyPMX1",
    "node1PqAa3BWWzUnTHVbw8NJHC874zn9ngAkXjgWEej",
    "node1Qm1bV4fwYnCurP8otJ9s5yrkPq7SPZ5uhj3Tsv",
    "node1UzzTxAAeBTpfZkQPJXBAqixsbdth11ba1NXLBG",
    "node1YtWCoTwwVYTFLfS19zquRQzYX332hs1HEuRBjC",
  ],
  // FlashBlock
  "flashblock": [
    "FLASHRzANfcAKDuQ3RXv9hbkBy4WVEKDzoAgxJ56DiE4",
    "FLAShWTjcweNT4NSotpjpxAkwxUr2we3eXQGhpTVzRwy",
    "FLAsHZTRcf3Dy1APaz6j74ebdMC6Xx4g6i9YxjyrDybR",
    "FLAshyAyBcKb39KPxSzXcepiS8iDYUhDGwJcJDPX4g2B",
    "FLaSHJNm5dWYzEgnHJWWJP5ccu128Mu61NJLxUf7mUXU",
    "FLaSHR4Vv7sttd6TyDF4yR1bJyAxRwWKbohDytEMu3wL",
    "FLaShB3iXXTWE1vu9wQsChUKq3HFtpMAhb8kAh1pf1wi",
    "FLasHXTqrbNvpWFB6grN47HGZfK6pze9HLNTgbukfPSk",
    "FLasHstqx11M8W56zrSEqkCyhMCCpr6ze6Mjdvqope5s",
    "FLashhsorBmM9dLpuq6qATawcpqk1Y2aqaZfkd48iT3W",
  ],
  // BlockRazor
  "blockrazor": [
    "295Avbam4qGShBYK7E9H5Ldew4B3WyJGmgmXfiWdeeyV",
    "4ABhJh5rZPjv63RBJBuyWzBK3g9gWMUQdTZP2kiW31V9",
    "5YktoWygr1Bp9wiS1xtMtUki1PeYuuzuCF98tqwYxf61",
    "5jA59cXMKQqZAVdtopv8q3yyw9SYfiE3vUCbt7p8MfVf",
    "68Pwb4jS7eZATjDfhmTXgRJjCiZmw1L7Huy4HNpnxJ3o",
    "6No2i3aawzHsjtThw81iq1EXPJN6rh8eSJCLaYZfKDTG",
    "A9cWowVAiHe9pJfKAj3TJiN9VpbzMUq6E4kEvf5mUT22",
    "AP6qExwrbRgBAVaehg4b5xHENX815sMabtBzUzVB4v8S",
    "B2M4NG5eyZp5SBQrSdtemzk5TqVuaWGQnowGaCBt8GyM",
    "BnGKHAC386n4Qmv9xtpBVbRaUTKixjBe3oagkPFKtoy6",
    "Dd7K2Fp7AtoN8xCghKDRmyqr5U169t48Tw5fEd3wT9mq",
    "EDi4rSy2LZgKJX74mbLTFk4mxoTgT6F7HxxzG2HBAFyK",
    "FjmZZrFvhnqqb9ThCuMVnENaM3JGVuGWNyCAxRJcFpg9",
    "Gywj98ophM7GmkDdaWs4isqZnDdFCW7B46TXmKfvyqSm",
  ],
  // Astralane (portal.astralane.io/blockline)
  "astralane": [
    "ASTRaoF93eYt73TYvwtsv6fMWHWbGmMUZfVZPo3CRU9C",
    "AStRAnpi6kFrKypragExgeRoJ1QnKH7pbSjLAKQVWUum",
    "AStrAJv2RN2hKCHxwUMtqmSxgdcNZbihCwc1mCSnG83W",
    "AsTRADtvb6tTmrsqULQ9Wji9PigDMjhfEMza6zkynEvV",
    "AsTRAEoyMofR3vUPpf9k68Gsfb6ymTZttEtsAbv8Bk4d",
    "AsTra79FET4aCKWspPqeSFvjJNyp96SvAnrmyAxqg5b7",
    "AstrA1ejL4UeXC2SBP4cpeEmtcFPZVLxx3XGKXyCW6to",
    "AstrABAu8CBTyuPXpV4eSCJ5fePEPnxN8NqBaPKQ9fHR",
    "Astran35aiQUF57XZsmkWMtNCtXGLzs8upfiqXxth2bz",
    "astra4uejePWneqNaJKuFFA8oonqCE1sqF6b45kDMZm",
    "astra9xWY93QyfG6yM8zwsKsRodscjQ2uU2HKNL5prk",
    "astraEJ2fEj8Xmy6KLG7B3VfbKfsHXhHrNdCQx7iGJK",
    "astraRVUuTHjpwEVvNBeQEgwYx9w9CFyfxjYoobCZhL",
    "astraZW5GLFefxNPAatceHhYjfA1ciq9gvfEg2S47xk",
    "astraubkDw81n4LuutzSQ8uzHCv4BhPVhfvTcYv8SKC",
    "astrawVNP4xDBKT7rAdxrLYiTSTdqtUr63fSMduivXK",
    "astrazznxsGUhWShqgNtAdfrzP2G83DzcWVJDxwV9bF",
  ],
  // Stellium
  "stellium": [
    "ste11JV3MLMM7x7EJUM2sXcJC1H7F4jBLnP9a9PG8PH",
    "ste11MWPjXCRfQryCshzi86SGhuXjF4Lv6xMXD2AoSt",
    "ste11TMV68LMi1BguM4RQujtbNCZvf1sjsASpqgAvSX",
    "ste11p5x8tJ53H1NbNQsRBg1YNRd4GcVpxtDw8PBpmb",
    "ste11p7e2KLYou5bwtt35H7BM6uMdo4pvioGjJXKFcN",
  ],
  // Lightspeed
  "lightspeed": [
    "53PhM3UTdMQWu5t81wcd35AHGc5xpmHoRjem7GQPvXjA",
    "9tYF5yPDC1NP8s6diiB3kAX6ZZnva9DM3iDwJkBRarBB",
  ],
  // Soyas
  "soyas": [
    "soyas4s6L8KWZ8rsSk1mF3d1mQScoTGGAgjk98bF8nP",
    "soyas5doVFUwH8s5zK8gEvCL5KR5ogDmf52LsrJEZ9h",
    "soyasDBdKjADwPz3xk82U3TNPRDKEWJj7wWLajNHZ1L",
    "soyasE2abjBAynmHbGWgEwk4ctBy7JMTUCNrMbjcnyH",
    "soyasQYhJxv8uZgWDxhg72td6piAf7XTkoyWHtSATEz",
    "soyascXFW5wEEYiwfEmHy2pNwomqzvggJosGVD6TJdY",
    "soyasi59njacMUPvo3TM5paHjeK8pYSdovXgFi32gRt",
    "soyastP66xyYC8XADXZjdMM5BAVGD2YRvz8dwtLsqb8",
    "soyasvdgUJWYcUCzDxpmjUnNjH7KamXLXTzLwFvdVPE",
    "soyasvxAunisNxaoRxkKGjNir7KmbwYnr37JmefkX9G",
  ],
  // SpeedLanding
  "speedlanding": [
    "SPeEDmkHkN3A2roSZf6aZyEMsmrGqTHKqwP51y2Y4rV",
    "SPeEdva37vW8vRtqgYjprQs1g3965icfVN5Rt7SMAyh",
    "SpEEdz8S1KorkMZqjMUxfxrmWwofmp6ReNP2Nx6CUmq",
    "SpEediGKLbbXndSYTzwmz6Z3NDgHQLDcTDEvGFkSMH9",
    "SpeeDy3GJM4wcrQmk1itRFWgidvxX4rwjTLMv78wwjE",
    "SpeedLdTJXh2RKpXEaP8JCxkWoUVXhtdPQ1EnxBJMxc",
    "speEdrSEpox5GUfHWcBc7tQjRuSfUin2yvB7qoYvvJh",
    "speede8xCcUq2Tiv1efXeTuE3k9TDNq8TnGKaKSc6J4",
  ],
  // Solami
  "solami": [
    "15qWd4huAkoxvhDsHMfpUn27TW1YBYMMJJ2jkAkbeam",
    "9XuGciSwr5wb7dLTQm91JhuBTvj3GG8WjuRDc3obeam",
    "SqoKQKU5uwBxovq3R7yEBxFwptc4z7vwoghU3M9beam",
    "kREnjPWFpt4AHeY5pijPmyXaCrMnbatUQJo7d3Xbeam",
    "kiQioJNyFG7pU36ELLsRKXkeT48kFbk3b6rSgrWbeam",
    "kjmVhW1UzJrW2sU5bY5NtZ79jpvjSStsj37Pzmabeam",
    "praRZG6N6MdbsT4EFpKgZJWReZGXQhAMFcH68oCbeam",
    "sV72TY66T1RfmDSeHPPbwX6wwJ3bBv5hd4ehJ8tbeam",
    "swf8MyEeLo7gtRUo27UuJj6naCASUrypU7dbteSbeam",
    "uiuaQsxA47JybQAVN4FTfYuoEDkMiXV1r591Aewbeam",
  ],
  // Hello Moon Lunar Lander (also docs.hellomoon.io/reference/lunar-lander)
  "lunar-lander": [
    "moon17L6BgxXRX5uHKudAmqVF96xia9h8ygcmG2sL3F",
    "moon26Sek222Md7ZydcAGxoKG832DK36CkLrS3PQY4c",
    "moon7fwyajcVstMoBnVy7UBcTx87SBtNoGGAaH2Cb8V",
    "moonBtH9HvLHjLqi9ivyrMVKgFUsSfrz9BwQ9khhn1u",
    "moonCJg8476LNFLptX1qrK8PdRsA1HD1R6XWyu9MB93",
    "moonF2sz7qwAtdETnrgxNbjonnhGGjd6r4W4UC9284s",
    "moonKfftMiGSak3cezvhEqvkPSzwrmQxQHXuspC96yj",
    "moonQBUKBpkifLcTd78bfxxt4PYLwmJ5admLW6cBBs8",
    "moonXwpKwoVkMegt5Bc776cSW793X1irL5hHV1vJ3JA",
    "moonZ6u9E2fgk6eWd82621eLPHt9zuJuYECXAYjMY1C",
  ],
  // Glaive
  "glaive": [
    "GLaiv4GMRYQmthatDS98uQT4HoucgxWT8NeJz6oSwxeU",
    "GLaivJSUL71FcocYa8tks5vpVyYzvaDMHtyrzfQF2ABr",
    "GLaivL5uPrDpvd1wTtvat38KGqb5WLhEdqQfnmNd3oNr",
    "GLaivRU6eDKrta3p3psFAWPEFLzCjeMHGpPUuQqTjtyv",
    "GLaivinAWh21NaJMhtExtD5G2gZs1xnvaYVZmwqobWZL",
    "GLaivq5dU8qHayz9Qf13LjPfVy3SmUhbmickfGiZdmfh",
  ],
};

/** Addresses treated as tips although the provider is unknown (see header). */
export const UNKNOWN_TIP_ACCOUNTS: readonly string[] = ["DSAiWuoci5RNZ7skPotJsL987YaWg7bTGwAYugZV97Kx"];

const BY_ADDRESS: ReadonlyMap<string, TipProvider> = new Map([
  ...Object.entries(TIP_ACCOUNTS).flatMap(([p, xs]) => xs.map((a) => [a, p] as [string, TipProvider])),
  ...UNKNOWN_TIP_ACCOUNTS.map((a) => [a, UNKNOWN_TIP] as [string, TipProvider]),
]);

/** Provider of a tip account, or null when the address is not a known tip account. */
export const tipProvider = (address: string): TipProvider | null => BY_ADDRESS.get(address) ?? null;
export const tipAccountCount = () => BY_ADDRESS.size;
