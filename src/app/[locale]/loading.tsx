import { Container } from '@/components/ui/container';

/**
 * Route loading state.
 *
 * A quiet skeleton that reserves roughly the space the page will occupy, so the transition
 * does not shift. No spinner: a spinner on a fast static route is more distracting than the
 * wait it describes.
 */
export default function Loading() {
  return (
    <Container width="wide" className="pt-40 pb-32" aria-hidden>
      <div className="flex flex-col gap-6">
        <div className="h-3 w-28 rounded-full bg-rule" />
        <div className="h-12 w-3/4 max-w-2xl rounded-md bg-rule" />
        <div className="h-4 w-1/2 max-w-md rounded-full bg-rule" />
      </div>
      <div className="mt-20 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="aperture aspect-3/4 w-full aperture-mask bg-rule" />
        ))}
      </div>
    </Container>
  );
}
