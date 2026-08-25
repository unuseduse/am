/// <reference path="./online-streaming-provider.d.ts" />
/// <reference path="./core.d.ts"/>

interface AnikotoEpisode {
    episode_no?: number;
    num?: number;
    title?: string;
    embed_url?: {
        sub?: string;
        dub?: string;
    };
}

interface AnikotoSeriesResponse {
    ok?: boolean;
    anime?: any;
    episodes?: AnikotoEpisode[];
    data?: {
        episodes?: AnikotoEpisode[];
    };
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
            // Call Anikoto series endpoint directly
            const response = await fetch(`https://anikotoapi.site/series/${aniListId}`);
            if (response.ok) {
                const json: AnikotoSeriesResponse = await response.json();
                const epList = json.episodes ?? json.data?.episodes ?? [];

                for (let i = 0; i < epList.length; i++) {
                    const ep = epList[i];
                    const epNum = ep.episode_no ?? ep.num ?? (i + 1);
                    
                    // Attach the sub and dub embed URLs provided by Anikoto directly into episode details
                    const subUrl = ep.embed_url?.sub || "";
                    const dubUrl = ep.embed_url?.dub || "";

                    episodes.push({
                        id: `${aniListId}?ep=${epNum}`,
                        number: epNum,
                        title: ep.title || `Episode ${epNum}`,
                        url: JSON.stringify({ sub: subUrl, dub: dubUrl, ep: epNum, id: aniListId })
                    });
                }
                if (episodes.length > 0) return episodes;
            }
        } catch (e) {
            console.error("[Megaplay] Failed to fetch series from Anikoto API", e);
        }

        // Fallback
        for (let i = 1; i <= 24; i++) {
            episodes.push({
                id: `${aniListId}?ep=${i}`,
                number: i,
                title: `Episode ${i}`,
                url: JSON.stringify({ sub: "", dub: "", ep: i, id: aniListId })
            });
        }

        return episodes;
    }

    async findEpisodeServer(
        episode: EpisodeDetails,
        _server: string
    ): Promise<EpisodeServer> {
        const isDub = episode.url.includes('"dub":') ? episode.url.includes("dub=true") : false;
        let targetUrl = "";

        try {
            const data = JSON.parse(episode.url);
            targetUrl = isDub ? (data.dub || data.sub) : (data.sub || data.dub);
            
            if (!targetUrl) {
                targetUrl = `https://megaplay.buzz/stream/ani/${data.id}/${data.ep}/${isDub ? 'dub' : 'sub'}`;
            }
        } catch {
            const aniListId = episode.url.split('?')[0];
            targetUrl = `https://megaplay.buzz/stream/ani/${aniListId}/${episode.number}/${isDub ? 'dub' : 'sub'}`;
        }

        console.debug(`[Megaplay] Resolving Stream URL: ${targetUrl}`);

        // Scrape or fetch the m3u8 playlist URL from targetUrl
        let finalStreamUrl = targetUrl;
        try {
            const res = await fetch(targetUrl, {
                headers: {
                    "Referer": "https://megaplay.buzz/",
                    "Origin": "https://megaplay.buzz",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36"
                }
            });
            const text = await res.text();
            const match = text.match(/(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/i);
            if (match) {
                finalStreamUrl = match[1];
            }
        } catch (e) {
            console.error("[Megaplay] Could not resolve direct m3u8 playlist", e);
        }

        return {
            server: "Server 1",
            headers: {
                "Referer": "https://megaplay.buzz/",
                "Origin": "https://megaplay.buzz",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36"
            },
            videoSources: [
                {
                    quality: "Auto",
                    subtitles: [],
                    type: "m3u8",
                    url: finalStreamUrl
                }
            ]
        };
    }
}
