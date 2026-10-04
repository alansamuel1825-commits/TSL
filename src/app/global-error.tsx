"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & {
    digest?: string;
  };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: "24px",
            fontFamily:
              "Arial, sans-serif",
            background: "#fbfcff",
            color: "#0f172a",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "520px",
              textAlign: "center",
              background: "white",
              border:
                "1px solid #e2e8f0",
              borderRadius: "28px",
              padding: "36px",
            }}
          >
            <h1
              style={{
                margin: 0,
                fontSize: "30px",
              }}
            >
              Alumni Connect could not load.
            </h1>

            <p
              style={{
                marginTop: "16px",
                lineHeight: 1.7,
                color: "#475569",
              }}
            >
              Please try loading the application again.
            </p>

            <button
              type="button"
              onClick={reset}
              style={{
                marginTop: "22px",
                border: 0,
                borderRadius: "999px",
                background: "#1d4ed8",
                color: "white",
                padding:
                  "12px 22px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
