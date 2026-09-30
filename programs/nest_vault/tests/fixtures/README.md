# Test fixtures

`skr-mint-mainnet.bin` is the raw 82-byte account data of the SKR mint on Solana mainnet,
`SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3` (owner: Token program, 6 decimals), read at
slot 452011256 with:

```bash
curl -s https://api.mainnet-beta.solana.com -H 'content-type: application/json'   -d '{"jsonrpc":"2.0","id":1,"method":"getAccountInfo","params":["SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3",{"encoding":"base64"}]}'
```

`guardian_rewards_work_with_mainnet_skr` loads it at the real SKR address, so the rewards pool
runs against SKR's actual mint account rather than a stand-in.
