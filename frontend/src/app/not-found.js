"use client";
export default function Error404() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
      }}
    >
      <h1
        style={{
          fontSize: 50,
          color: "#f00",
          marginBottom: 20,
        }}
      >
        404
      </h1>
      <p>
        Page Not Found{" "}
        <span
          onClick={(e) => {
            e.preventDefault();
            window.location.href = "/";
          }}
          style={{
            cursor: "pointer",
            color: "#f00",
          }}
        >
          Go Home
        </span>
      </p>
    </div>
  );
}
