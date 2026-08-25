// <reference path="./online-streaming-provider.d.ts" />
// <reference path="./core.d.ts" />

class Provider {
    private api: string = "{{baseUrl}}";

    getSettings(): Settings {
        return {
            episodeServers: ["Server 1"],
            supportsDub: true,
        };
    }

    async search(query: SearchOptions): Promise<SearchResult[]> {
        return [
            {
                id: query.query,
                url: this.api,
                title: query.query,
                subOrDub: "both",
            }
        ];
    }

    async findEpisodes(id: string): Promise<EpisodeDetails[]> {
        const episodes: EpisodeDetails[] = [];

        for (let i = 1; i <= 100; i++) {
            episodes.push({
                id: `${id}?ep=${i}`,
                number: i,
                title: `Episode ${i}`,
                url: `${id}?ep=${i}`
            });
        }

        return episodes;
    }

    async findEpisodeServers(
        episode: EpisodeDetails,
        _server: string
    ): Promise<EpisodeServers> {
        const isDub = episode.url.includes("dub=true");
        const episodeNum = episode.number;

        // Extract the AniList ID passed by Seanime
        const aniListId = episode.url.split('?')[0];
        const langPath = isDub ? "dub" : "sub";

        // Megaplay Endpoint: /stream/ani/{anilist-id}/{ep-num}/{language}
        const embedUrl = `${this.api}/stream/ani/${aniListId}/${episodeNum}/${langPath}`;

        console.debug(`[Megaplay] Generated Embed Target: ${embedUrl}`);

        return {
            server: "Server 1",
            headers: {
                "Referer": "https://megaplay.buzz/",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36"
            },
            videoSources: [
                {
                    quality: "Auto",
                    subtitles: [],
                    type: "iframe",
                    url: embedUrl
                }
            ]
        };
    }
}

export default new Provider();
