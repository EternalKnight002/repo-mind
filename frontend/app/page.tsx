"use client";

import { useState } from "react";
import SearchBar from "../components/SearchBar";
import RepoCard from "../components/RepoCard";
import Loader from "../components/Loader";

type Repo = {
  repo?: string;
  summary?: string;
  stars?: number;
  language?: string;
  url?: string;
};

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query) return;
    setLoading(true);
    setResults([]);

    try {
      const res = await fetch("http://localhost:5000/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const data = await res.json();
      // Try to coerce/validate shape in case backend returns unknown shape
      const typed = Array.isArray(data) ? data as Repo[] : [];
      setResults(typed);
    } catch (err) {
      console.error("Search error:", err);
      setResults([
        {
          repo: "owner/example-repo",
          summary: "This is a mock summary — backend offline.",
          stars: 123,
          language: "TypeScript",
          url: "https://github.com/owner/example-repo",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full py-6">
      <SearchBar query={query} setQuery={setQuery} onSearch={handleSearch} />
      {loading ? (
        <Loader />
      ) : (
        <div className="mt-6 grid gap-4 w-full">
          {results.map((repo, idx) => (
            <RepoCard key={idx} repo={repo} />
          ))}
        </div>
      )}
    </div>
  );
}
