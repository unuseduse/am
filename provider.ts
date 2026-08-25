/// <reference path="./online-streaming-provider.d.ts" />
/// <reference path="./core.d.ts"/>

interface AnikotoEpisode {
    id: number;
    number: number;
    title: string;
    episode_embed_id: string;
    embed_url?: {
        sub?: string;
        dub?: string;
    };
}

class Provider {
    private api: string = "https://anikotoapi.site";

    getSettings(): Settings {
        return {
            episodeServers: ["Subbed", "Dubbed"],
            supportsDub: true,
        };
    }

    async search(query: SearchOptions): Promise<SearchResult[]> {
        return [
            {
                id: query.query,
                url: `${this.api}/series/${query.query}`,
                title: query.query,
                subOrDub: "both",
            }
        ];
    }

    async findEpisodes(id: string): Promise<EpisodeDetails[]> {
        const aniListId = id.split('?')[0];
        const episodes: EpisodeDetails[] = [];
        let internalId = aniListId;

        try {
            // First attempt direct load with provided ID
            let response = await fetch(`${this.api}/series/${internalId}`);
            let json = await response.json();

            // Check if returned anime matches our AniList ID; if not, query recent/search mapping
            if (!json.ok || (json.data?.anime?.ani_id && String(json.data.anime.ani_id) !== String(aniListId))) {
                // If the ID wasn't internal, search by term or fetch series directly
                const searchRes = await fetch(`${this.api}/series/${aniListId}`);
                const searchJson = await searchRes.json();
                if (searchJson.ok) json = searchJson;
            }

            const epList: AnikotoEpisode[] = json.data?.episodes ?? json.episodes ?? [];

            for (let i = 0; i < epList.length; i++) {
                const ep = epList[i];
                const epNum = ep.number ?? (i + 1);

                episodes.push({
                    id: `${aniListId}?ep=${epNum}`,
                    number: epNum,
                    title: ep.title || `Episode ${epNum}`,
                    url: JSON.stringify({
                        sub: ep.embed_url?.sub || "",
                        dub: ep.embed_url?.dub || "",
                        embed_id: ep.episode_embed_id,
                        number: epNum
                    })
                });
            }
        } catch (e) {
            console.error("[Anikoto] Failed to load episodes", e);
        }

        return episodes;
    }

    async findEpisodeServer(
        episode: EpisodeDetails,
        server: string
    ): Promise<EpisodeServer> {
        const isDub = server.toLowerCase().includes("dub");
        let streamTarget = "";

        try {
            const data = JSON.parse(episode.url);
            streamTarget = isDub ? (data.dub || data.sub) : (data.sub || data.dub);
            
            // Fallback if missing embed_url
            if (!streamTarget && data.embed_id) {
                streamTarget = `https://megaplay.buzz/stream/s-2/${data.embed_id}/${isDub ? 'dub' : 'sub'}`;
            }
        } catch {
            streamTarget = "";
        }

        return {
            server: server || "Subbed",
            headers: {
                "Referer": "https://megaplay.buzz/",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36"
            },
            videoSources: [
                {
                    quality: "Auto",
                    subtitles: [],
                    type: "m3u8",
                    url: streamTarget
                }
            ]
        };
    }
}
