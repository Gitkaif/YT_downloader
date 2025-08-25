export async function safeFetch(url, options = {}) {
  const res = await fetch(url, options);
  const contentType = res.headers.get("content-type") || "";

  let data;
  if (contentType.includes("application/json")) {
    data = await res.json().catch(() => ({}));
  } else {
    data = await res.text().catch(() => "");
  }

  if (!res.ok) {
    throw new Error(
      typeof data === "string"
        ? `Request failed (${res.status}): ${data.slice(0, 100)}`
        : data.error || `Request failed (${res.status})`
    );
  }

  return data;
}
