import {
  Button,
  DataTable,
  Field,
  Label,
  Meter,
  Num,
  Panel,
  RoomRow,
  RoomStrip,
  StatusChip,
  TopNav,
} from '@earshot/ui';
// `verbatimModuleSyntax` is on, so a type-only import has to say so.
import type { Column } from '@earshot/ui';

/**
 * Component gallery.
 *
 * This is deliberately not Storybook. Storybook earns its keep when
 * components need isolating from an app that is hard to run; right now the
 * app IS the cheapest harness, and a page costs no extra build pipeline. It
 * also proves the whole chain end to end in one go: tokens.json -> build.mjs
 * -> theme.css -> Tailwind utilities -> component -> rendered page. Storybook
 * goes in once there are enough components that one page stops being legible.
 *
 * Both themes render side by side, because a component that only ever gets
 * looked at in one theme is a component that breaks in the other.
 */

type Track = {
  n: string;
  title: string;
  artist: string;
  bpm: number;
  key: string;
  licence: string;
  lufs: string;
  len: string;
};

const TRACKS: Track[] = [
  { n: '01', title: 'Registan Dusk', artist: 'Dilnoza K.', bpm: 96, key: 'Dm', licence: 'CC BY-SA', lufs: '−14.2', len: '5:12' },
  { n: '02', title: 'Copper Wire', artist: 'Juno Field', bpm: 128, key: 'A', licence: 'CC BY', lufs: '−11.8', len: '3:48' },
  { n: '03', title: 'Paper Lanterns', artist: 'Sora Lin', bpm: 84, key: 'F#m', licence: 'CC BY', lufs: '−16.0', len: '6:02' },
];

const COLUMNS: Column<Track>[] = [
  { key: 'n', header: '#', width: '46px', render: (t) => <Num tone="muted">{t.n}</Num> },
  { key: 'title', header: 'Title', render: (t) => <span className="font-medium text-primary">{t.title}</span> },
  { key: 'artist', header: 'Artist', width: '160px', render: (t) => <span className="text-secondary">{t.artist}</span> },
  { key: 'bpm', header: 'BPM', align: 'right', width: '60px', render: (t) => <Num tone="muted">{t.bpm}</Num> },
  { key: 'key', header: 'Key', align: 'right', width: '54px', render: (t) => <Num tone="muted">{t.key}</Num> },
  { key: 'licence', header: 'Licence', width: '92px', render: (t) => <Label>{t.licence}</Label> },
  { key: 'lufs', header: 'LUFS', align: 'right', width: '62px', render: (t) => <Num tone="muted">{t.lufs}</Num> },
  { key: 'len', header: 'Len', align: 'right', width: '58px', render: (t) => <Num tone="muted">{t.len}</Num> },
];

const MEMBERS = [
  { initials: 'MO', name: 'Mara', driftMs: 0 },
  { initials: 'JL', name: 'Jules', driftMs: 18 },
  { initials: 'TK', name: 'Tomas', driftMs: 42 },
  { initials: 'RB', name: 'Rinat', driftMs: 211 },
  { initials: 'SL', name: 'Sora', driftMs: null },
];

const NAV = [
  { href: '/', label: 'On air', current: true },
  { href: '/crate', label: 'Crate' },
  { href: '/shelf', label: 'Shelf' },
  { href: '/studio', label: 'Studio' },
];

function Gallery() {
  return (
    <div className="min-h-screen bg-base text-primary">
      <TopNav items={NAV}>
        <Button variant="accent">Open room</Button>
      </TopNav>

      <RoomStrip
        room="Late Night Lab"
        track="Transit Pattern"
        artist="Mara Osei"
        elapsed="02:14"
        remaining="−03:41"
        progress={38}
        members={MEMBERS}
        maxDriftMs={42}
        bufferSeconds={2.4}
        bitrateKbps={256}
      />

      <main className="flex flex-col gap-7 px-5 py-6">
        <Panel title="On air now" aside={<Label>3 rooms · 15 listening</Label>}>
          <RoomRow
            name="Late Night Lab"
            mode="Host picks · you are in"
            host="Hosted by Mara"
            track="Transit Pattern"
            artist="Mara Osei"
            listeners={5}
            driftMs={42}
            cta="Open"
          />
          <RoomRow
            name="DJ Rotation"
            mode="Turns · Okonkwo is up"
            host="Hosted by Juno Field"
            track="Slow Meridian"
            artist="Okonkwo"
            listeners={8}
            driftMs={211}
            cta="Join"
            accentEdge="warn"
          />
        </Panel>

        <Panel title="The crate" aside={<Label>Creative Commons</Label>}>
          <div className="p-0">
            <DataTable
              columns={COLUMNS}
              rows={TRACKS}
              rowKey={(t) => t.n}
              caption="New tracks this week, with tempo, key, licence and loudness"
            />
          </div>
        </Panel>

        <div className="grid gap-5 md:grid-cols-2">
          <Panel title="Buttons and status">
            <div className="flex flex-wrap items-center gap-2.5 p-4">
              <Button variant="accent">Join</Button>
              <Button>Add to queue</Button>
              <Button variant="quiet">Skip</Button>
              <StatusChip tone="live">live 42ms</StatusChip>
              <StatusChip tone="warn">drift 211ms</StatusChip>
              <StatusChip tone="error">failed</StatusChip>
              <StatusChip tone="neutral" dot={false}>
                aac 256
              </StatusChip>
            </div>
          </Panel>

          <Panel title="Numbers and meters">
            <div className="flex flex-col gap-3 p-4">
              <div className="flex flex-wrap items-baseline gap-4">
                <Num className="text-[20px] font-bold" unit="ms" tone="live">
                  42
                </Num>
                <Num className="text-[20px] font-bold" unit="ms" tone="warn">
                  211
                </Num>
                <Num className="text-[20px] font-bold">124</Num>
                <Num tone="muted">02:14.380</Num>
              </div>
              <Meter value={38} label="Playback position" />
              <Meter value={84} tone="warn" label="Listener drift" />
            </div>
          </Panel>

          <Panel title="Fields">
            <div className="flex flex-col gap-4 p-4">
              <Field id="g-title" label="Title" defaultValue="Underpass Hum" />
              <Field
                id="g-bpm"
                label="BPM"
                defaultValue="102"
                mono
                hint="Detected automatically. Edit if wrong."
              />
            </div>
          </Panel>

          <Panel title="Per-listener drift">
            <ul className="flex flex-col gap-2.5 p-4">
              {MEMBERS.map((m) => (
                <li key={m.initials} className="flex items-center gap-2.5">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-sm border border-strong bg-raised font-mono text-[8.5px] text-secondary">
                    {m.initials}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px]">{m.name}</span>
                  <span className="w-14 shrink-0">
                    <Meter
                      value={m.driftMs === null ? 100 : Math.min(100, (m.driftMs / 250) * 100)}
                      tone={m.driftMs === null || m.driftMs >= 250 ? 'warn' : 'live'}
                      label={`${m.name} drift`}
                    />
                  </span>
                  <span className="w-16 shrink-0 text-right">
                    {m.driftMs === null ? (
                      <Num tone="warn">resync</Num>
                    ) : (
                      <Num tone="muted" unit="ms">
                        {m.driftMs}
                      </Num>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </main>
    </div>
  );
}

export default function Page() {
  return (
    <>
      {/* Both sections state their theme EXPLICITLY. Leaving the night one to
          inherit the default looks equivalent and is not: the root falls to
          light under `prefers-color-scheme: light`, so on a light OS — and in
          headless Chromium, which reports light — the "night" half rendered
          light and the comparison silently showed the same theme twice. */}
      <section aria-label="Night theme" data-theme="dark">
        <Gallery />
      </section>
      {/* The same tree, one attribute different. A component that hardcoded a
          colour instead of using a token shows up here immediately. */}
      <section aria-label="Light theme" data-theme="light">
        <Gallery />
      </section>
    </>
  );
}
