interface TokenData {
    name: string;
    symbol: string;
    oracle: string;
}

export const tokenData: Record<string, TokenData> = {
    "0x6B3595068778DD592e39A122f4f5a5cF09C90fE2": {
        name: "Sushi",
        symbol: "SUSHI",
        oracle: "0xcc70f09a6cc17553b2e31954cd36e4a2d89501f7"
    },
    "0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e": {
        name: "Yearn",
        symbol: "YFI",
        oracle: "0xa027702dbb89fbd58938e4324ac03b58d812b0e1"
    }
}