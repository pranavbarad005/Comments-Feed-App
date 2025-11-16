import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { configureStore, createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { Provider, useDispatch, useSelector } from "react-redux";


export const fetchComments = createAsyncThunk(
    "comments/fetchComments",
    async (_, { rejectWithValue }) => {
        try {
            const res = await fetch("https://jsonplaceholder.typicode.com/comments");
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            return data;
        } catch (err) {
            return rejectWithValue(err.message || "Failed to fetch");
        }
    }
);

const commentsSlice = createSlice({
    name: "comments",
    initialState: {
        items: [],
        status: "idle",
        error: null,
    },
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchComments.pending, (state) => {
                state.status = "loading";
                state.error = null;
            })
            .addCase(fetchComments.fulfilled, (state, action) => {
                state.status = "succeeded";
                state.items = action.payload;
            })
            .addCase(fetchComments.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.payload || action.error.message;
            });
    },
});

const store = configureStore({
    reducer: { comments: commentsSlice.reducer },
});


const getDomain = (email = "") => {
    const parts = email.split("@");
    return parts.length > 1 ? parts[1].toLowerCase() : "unknown";
};

// -----------------------------
// App
// -----------------------------
export default function CommentsFeedApp() {
    return (
        <Provider store={store}>
            <CommentsFeed />
        </Provider>
    );
}

function CommentsFeed() {
    const dispatch = useDispatch();
    const { items, status, error } = useSelector((s) => s.comments);

    const [query, setQuery] = useState("");
    const [domainFilter, setDomainFilter] = useState("all");
    const [expandedDomains, setExpandedDomains] = useState({});
    const [expandedCommentIds, setExpandedCommentIds] = useState({});

    useEffect(() => {
        if (status === "idle") dispatch(fetchComments());
    }, [status, dispatch]);

    // Collect all domains
    const domains = useMemo(() => {
        const s = new Set(items.map((c) => getDomain(c.email)));
        return ["all", ...Array.from(s).sort()];
    }, [items]);
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();

        return items.filter((c) => {
            if (domainFilter !== "all" && getDomain(c.email) !== domainFilter)
                return false;

            // EXACT ID MATCH when query is only digits
            if (/^\d+$/.test(q)) {
                return c.id.toString() === q; // exact match
            }

            if (!q) return true;

            return (
                c.name.toLowerCase().includes(q) ||
                c.email.toLowerCase().includes(q) ||
                c.body.toLowerCase().includes(q)
            );
        });
    }, [items, query, domainFilter]);

    // Group by domain
    const grouped = useMemo(() => {
        const map = {};
        filtered.forEach((c) => {
            const d = getDomain(c.email);
            if (!map[d]) map[d] = [];
            map[d].push(c);
        });
        return map;
    }, [filtered]);

    const toggleDomain = (d) =>
        setExpandedDomains((s) => ({ ...s, [d]: !s[d] }));

    const toggleComment = (id) =>
        setExpandedCommentIds((s) => ({ ...s, [id]: !s[id] }));

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
                <header className="mb-6">
                    <h1 className="text-2xl md:text-3xl font-bold">Comments Feed</h1>
                   
                </header>

                {/* Search + Filters */}
                <section className="mb-6 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search by name, email, body, ID "
                        className="w-full md:w-80 px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />

                    <div className="flex items-center gap-3">
                        <select
                            value={domainFilter}
                            onChange={(e) => setDomainFilter(e.target.value)}
                            className="px-3 py-2 rounded-lg border"
                        >
                            {domains.map((d) => (
                                <option key={d} value={d}>
                                    {d === "all" ? "All domains" : d}
                                </option>
                            ))}
                        </select>

                        <div className="text-sm text-gray-600">
                            Total: <span className="font-medium">{filtered.length}</span>
                        </div>
                    </div>
                </section>

                {/* UI  */}
                <main>
                    {status === "loading" && (
                        <div className="py-12 text-center">
                            <div className="inline-block animate-spin border-4 border-gray-300 border-t-blue-500 rounded-full w-12 h-12 mb-3" />
                            <div className="text-sm text-gray-700">Loading comments...</div>
                        </div>
                    )}

                    {status === "failed" && (
                        <div className="p-6 bg-red-50 border-l-4 border-red-400 rounded">
                            Error: {error}
                        </div>
                    )}

                    {status === "succeeded" && filtered.length === 0 && (
                        <div className="p-6 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                            No comments match your search
                        </div>
                    )}

                    {/* Grouped list */}
                    {status === "succeeded" && Object.keys(grouped).length > 0 && (
                        <div className="space-y-4">
                            {Object.keys(grouped)
                                .sort()
                                .map((domain) => (
                                    <DomainGroup
                                        key={domain}
                                        domain={domain}
                                        comments={grouped[domain]}
                                        expanded={!!expandedDomains[domain]}
                                        onToggle={() => toggleDomain(domain)}
                                        expandedCommentIds={expandedCommentIds}
                                        onToggleComment={toggleComment}
                                    />
                                ))}
                        </div>
                    )}
                </main>

                <footer className="mt-10 text-xs text-gray-500">
                    Tip: Click a domain to expand. Click a comment to show full body.
                </footer>
            </div>
        </div>
    );
}

function DomainGroup({ domain, comments, expanded, onToggle, expandedCommentIds, onToggleComment }) {
    return (
        <div className="bg-white border rounded-lg shadow-sm">
            <button
                onClick={onToggle}
                className="w-full text-left px-4 py-3 flex items-center justify-between"
            >
                <div>
                    <div className="text-sm font-semibold">{domain}</div>
                    <div className="text-xs text-gray-500">
                        {comments.length} comment{comments.length > 1 ? "s" : ""}
                    </div>
                </div>
                <div className="text-sm text-blue-600">
                    {expanded ? "Collapse" : "Expand"}
                </div>
            </button>

            {expanded && (
                <div className="p-4 space-y-3">
                    {comments.map((c) => (
                        <article
                            key={c.id}
                            onClick={() => onToggleComment(c.id)}
                            className="cursor-pointer p-3 border rounded hover:shadow transition-shadow"
                        >
                            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                                <div>
                                    <div className="text-sm font-medium">{c.name}</div>
                                    <div className="text-xs text-gray-500">{c.email}</div>
                                </div>
                                <div className="text-xs text-gray-400">
                                    ID: {c.id} • Post: {c.postId}
                                </div>
                            </div>

                            <div className="mt-2 text-sm text-gray-700">
                                {expandedCommentIds[c.id] ? (
                                    <FullBody body={c.body} />
                                ) : (
                                    <TruncatedBody body={c.body} />
                                )}
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
}

function TruncatedBody({ body }) {
    const short = body.length > 120 ? body.slice(0, 120) + "..." : body;
    return (
        <div>
            {short}
            <span className="ml-1 text-xs text-gray-400">(click to expand)</span>
        </div>
    );
}

function FullBody({ body }) {
    return <div className="whitespace-pre-wrap">{body}</div>;
}

// Render standalone
if (typeof document !== "undefined") {
    const el = document.getElementById("root");
    if (el) {
        const root = createRoot(el);
        root.render(<CommentsFeedApp />);
    }
}
