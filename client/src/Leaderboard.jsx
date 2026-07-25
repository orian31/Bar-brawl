export default function Leaderboard({ players }) {
  return (
    <ol className="leaderboard">
      {players.map((p, i) => (
        <li key={p.id} className={i === 0 ? "first" : ""}>
          <span className="rank">{i + 1}</span>
          <span className="name">{p.name}</span>
          <span className="score">{p.score}</span>
        </li>
      ))}
    </ol>
  );
}
