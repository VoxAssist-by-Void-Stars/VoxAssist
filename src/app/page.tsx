import { listDemoUsernames } from "@/lib/users";

export default function Home() {
  const usernames = listDemoUsernames();

  return (
    <main style={{ padding: "1.5rem" }}>
      <h1>VoxAssist</h1>
      <p>
        Personal-KB RAG — sign in to call <code>/api/ask</code> and{" "}
        <code>/api/plan</code>.
      </p>
      <p style={{ color: "#555" }}>
        Friend scope usernames (demo map): {usernames.join(", ")}
      </p>
    </main>
  );
}
