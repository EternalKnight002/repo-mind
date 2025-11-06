// components/RepoCard.tsx
interface Props {
  repo: {
    repo?: string;
    summary?: string;
    stars?: number;
    language?: string;
    url?: string;
  };
}

export default function RepoCard({ repo }: Props) {
  return (
    <div className="p-5 bg-gray-800 rounded-lg shadow-md hover:shadow-blue-500/20 transition">
      <a href={repo.url} target="_blank" rel="noreferrer" className="text-xl font-semibold text-blue-400 hover:underline">
        {repo.repo || "Unknown Repo"}
      </a>
      <p className="mt-2 text-gray-300">{repo.summary}</p>
      <div className="mt-3 flex gap-4 text-sm text-gray-400">
        <span>⭐ {repo.stars ?? 0}</span>
        <span>💻 {repo.language ?? "N/A"}</span>
      </div>
    </div>
  );
}
