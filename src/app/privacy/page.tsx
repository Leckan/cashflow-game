export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="display text-5xl">Privacy</h1>
      <div className="mt-4 max-w-2xl space-y-4 leading-7 text-paper/85">
        <p>WealthQuest stores a guest id in a cookie, the display name you type, and the fictional finances of your games. It does not ask for a bank login, a brokerage account, or a government id.</p>
        <p>Demo sign-in keeps an email and name inside a signed session cookie. The password is a shared local word, not a personal secret worth reusing anywhere else.</p>
        <p>You can export your games from the player page and delete the games owned by the current browser or demo account. Deleting the cookie starts a new guest. Files live in the server’s .data folder unless Postgres is configured.</p>
        <p>Leaderboard entries, when you leave sharing on, show a display name, a game score, and an ending. They do not show an email address.</p>
      </div>
    </main>
  );
}
