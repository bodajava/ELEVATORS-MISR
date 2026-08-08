import Image from 'next/image';

import type { ImageAsset } from '@/lib/media';
import { cn } from '@/lib/utils';

/**
 * A project photograph.
 *
 * The manifest carries the source's real dimensions, so `next/image` always reserves the right
 * box and nothing shifts. `sizes` must be passed by the call site — a wrong `sizes` is the
 * usual reason an image downloads at several times the width it renders at.
 *
 * Cropping note: every source is watermarked, most with a translucent mark across the centre
 * and a badge in one corner. Centred `object-cover` keeps both the elevator and the company's
 * own mark intact; a tighter crop would clip the badge and misrepresent the photograph.
 */
export function ProjectImage({
  image,
  alt,
  sizes,
  priority = false,
  className,
  objectPosition,
}: {
  image: ImageAsset;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  /**
   * Per-image crop anchor, e.g. `'50% 35%'`.
   *
   * Centred cover is right for most of these frames, but not all: where a landscape capture
   * is placed in a taller box the subject sits above centre, and centring throws away the
   * car. Pass a position rather than accepting a bad crop.
   */
  objectPosition?: string;
}) {
  return (
    <Image
      src={image.src}
      alt={alt}
      width={image.width}
      height={image.height}
      sizes={sizes}
      priority={priority}
      loading={priority ? undefined : 'lazy'}
      placeholder="blur"
      blurDataURL={image.blurDataURL}
      style={objectPosition ? { objectPosition } : undefined}
      className={cn('size-full object-cover', !objectPosition && 'object-center', className)}
    />
  );
}
