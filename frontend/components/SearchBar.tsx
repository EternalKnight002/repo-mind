// components/SearchBar.tsx
"use client";

interface Props {
  query: string;
  setQuery: (val: string) => void;
  onSearch: () => void;
}

export default function SearchBar({ query, setQuery, onSearch }: Props) {
  return (
    <div className="flex w-full max-w-2xl mx-auto">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search GitHub repos (e.g. Next.js auth app)"
        className="flex-grow p-3 rounded-l-lg text-black outline-none"
      />
      <button
        type="button"
        onClick={onSearch}
        className="bg-blue-600 px-4 py-3 rounded-r-lg hover:bg-blue-700 transition"
      >
        Search
      </button>
    </div>
  );
}
