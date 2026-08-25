/// <reference path="./online-streaming-provider.d.ts" />
/// <reference path="./core.d.ts"/>

interface AnikotoEpisode {
    episode_no?: number;
    num?: number;
    title?: string;
    episode_embed_id?: string;
}

interface AnikotoSeriesResponse {
    status?: boolean;
    data?: {
        episodes?: AnikotoEpisode[];
        total_episodes?: number;
    };
    episodes?: AnikotoEpisode[];
}

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
        const aniListId = id.split('?')[0];
        const episodes: EpisodeDetails[] = [];

        try {
            // Attempt to fetch the actual series details from Anikoto API
            const response = await fetch(`https://anikotoapi.site/series/${aniListId}`);
            if (response.ok) {
                const json: AnikotoSeriesResponse = await response.json();
                const epList = json.data?.episodes ?? json.episodes ?? [];

                if (epList.length > 0) {
                    for (let i = 0; i < epList.length; i++) {
                        const epNum = epList[i].episode_no ?? epList[i].num ?? (i + 1);
                        episodes.push({
                            id: `${aniListId}?ep=${epNum}`,
                            number: epNum,
                            title: epList[i].title || `Episode ${epNum}`,
                            url: `${aniListId}?ep=${epNum}`
                        });
                    }
                    return episodes;
                }
            }
        } catch (e) {
            console.error("[Megaplay] Failed to fetch episode list from Anikoto API", e);
        }

        // Fallback: Default to a smaller count (e.g. 12 or 24) if API fetch fails
        const fallbackCount = 24;
        for (let i = 1; i <= fallbackCount; i++) {
            episodes.push({
                id: `${aniListId}?ep=${i}`,
                number: i,
                title: `Episode ${i}`,
                url: `${aniListId}?ep=${i}`
            });
        }

        return episodes;
    }

    async findEpisodeServer(
        episode: EpisodeDetails,
        _server: string
    ): Promise<EpisodeServer> {
        const isDub = episode.url.includes("dub=true");
        const episodeNum = episode.number;
        
        const aniListId = episode.url.split('?')[0];
        const langPath = isDub ? "dub" : "sub";

        // Endpoint per Megaplay docs: /stream/ani/{anilist-id}/{ep-num}/{language}
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
