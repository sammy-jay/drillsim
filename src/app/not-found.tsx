import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-24 text-center">
      <div className="num text-[64px] font-semibold leading-none text-accent">404</div>
      <h1 className="mt-4 text-[22px] font-semibold text-ink">Lost circulation</h1>
      <p className="mt-2 text-[14.5px] text-ink-2">
        This page went somewhere downhole and never came back. Let&apos;s get you back to the rig floor.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex h-10 items-center rounded-lg bg-accent px-4 text-[14px] font-semibold text-accent-ink hover:brightness-110"
      >
        Back to home
      </Link>
    </div>
  );
}
