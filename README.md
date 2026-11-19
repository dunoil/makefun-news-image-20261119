[![make.fun · news-image-20261119](https://make.fun/badge/news-image-20261119.svg)](https://make.fun/bounty/news-image-20261119?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261119)
[![rank](https://make.fun/badge/news-image-20261119/dunoil/makefun-news-image-20261119/rank.svg)](https://make.fun/bounty/news-image-20261119/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261119)
[![reward](https://make.fun/badge/news-image-20261119/dunoil/makefun-news-image-20261119/reward.svg)](https://make.fun/bounty/news-image-20261119?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261119)

# Thursday 19 November 2026 — The World's News in One Picture

One 1024×1024 front page summing up Thursday 19 November 2026: **44 stories**,
**14 illustrated** (a Gulf lead map plus 13 scene cards), across **7 regions**
and **10 fields**, with a world map, numbered briefs and a DATE CHECK box
naming the prior-day stories left out on purpose. Every story was
cross-checked against two or more independent sources; the full source list
is in [SOURCES.md](SOURCES.md).

The image is drawn from scratch by `main.ts` (Node 22, standard library
only): a hand-built bitmap typeface, vector scene illustrations, a
deterministic PNG encoder. No network, no image assets. Run it with:

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

It writes `out/entry.png` (1024×1024, under 1 MiB). Run it twice and the
bytes are identical.

## License

MIT — see [LICENSE](LICENSE).
