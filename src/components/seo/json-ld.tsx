/**
 * JSON-LD emitter.
 *
 * The payload is always built server-side from typed content modules — never from user input
 * and never from model output — so there is no injection surface here. `JSON.stringify` is
 * still escaped for `<` to close off the classic `</script>` break-out, which is cheap
 * insurance if a content string ever gains an angle bracket.
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const payload = Array.isArray(data) ? data : [data];

  return (
    <>
      {payload.map((item, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(item).replace(/</g, '\\u003c'),
          }}
        />
      ))}
    </>
  );
}
