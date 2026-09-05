'use client';

import { useState } from 'react';
import { Bookmark, Calendar, Search, Users } from 'lucide-react';
import {
  Avatar, Badge, Button, Checkbox, Combobox, Command, Dialog, DialogContent, DialogFooter,
  DialogTrigger, Field, Input, Pagination, Popover, PopoverContent, PopoverTrigger, Radio,
  RadioGroup, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Sheet, SheetContent,
  SheetTrigger, Skeleton, Switch, Table, TableBody, TableCell, TableHead, TableHeaderCell,
  TableRow, TableWrapper, Tabs, TabsContent, TabsList, TabsTrigger, Textarea, Tooltip,
  TooltipProvider, useCommandShortcut, useToast,
} from '@/components/primitives';
import {
  EmptyState, ErrorState, EventCard, FilterBar, MemberCard, PageHeader, Prose,
  Section, StoryCard,
} from '@/components/patterns';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-[var(--spacing-3)] border-t border-line py-[var(--spacing-5)]">
      <p className="text-2xs uppercase tracking-wide text-ink-subtle">{label}</p>
      <div className="flex flex-wrap items-center gap-[var(--spacing-4)]">{children}</div>
    </div>
  );
}

function Block({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-[var(--spacing-9)] py-[var(--spacing-7)]">
      <h2 className="text-2xl">{title}</h2>
      <div className="mt-[var(--spacing-4)]">{children}</div>
    </section>
  );
}

const OPTIONS = [
  { value: 'medicine', label: 'Medicine', hint: '38 members' },
  { value: 'engineering', label: 'Engineering', hint: '112 members' },
  { value: 'law', label: 'Law', hint: '19 members' },
  { value: 'public-service', label: 'Public service', hint: '27 members' },
  { value: 'closed', label: 'Archived field', disabled: true },
];

export function DesignClient() {
  const { toast } = useToast();
  const [checked, setChecked] = useState<boolean | 'indeterminate'>(false);
  const [switched, setSwitched] = useState(true);
  const [combo, setCombo] = useState<string | null>('engineering');
  const [query, setQuery] = useState('');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sort, setSort] = useState<'asc' | 'desc' | null>('asc');

  useCommandShortcut(() => setPaletteOpen(true));

  return (
    <TooltipProvider>
      <Section>
        <PageHeader
          eyebrow="Internal"
          title="Design system"
          lede="Every primitive in every state. If something looks wrong here, it is wrong everywhere."
          actions={<Button variant="primary" onClick={() => setPaletteOpen(true)}>Open palette (⌘K)</Button>}
        />

        <Block id="button" title="Button">
          <Row label="Variants">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="link">Link</Button>
          </Row>
          <Row label="Sizes">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </Row>
          <Row label="States">
            <Button disabled>Disabled</Button>
            <Button loading>Loading</Button>
            <Button variant="primary" loading>Saving</Button>
            <Button variant="primary"><Bookmark className="size-[var(--spacing-3)]" />With icon</Button>
          </Row>
          <Row label="Block">
            <div className="w-full max-w-[20rem]"><Button block variant="primary">Full width</Button></div>
          </Row>
        </Block>

        <Block id="field" title="Field, Input, Textarea">
          <div className="grid max-w-[40rem] gap-[var(--spacing-5)]">
            <Field label="Full name" hint="As it should appear in the register." required>
              <Input placeholder="Śrīvāsa Ṭhākura" />
            </Field>
            <Field label="Email" error="That address is already in the register.">
              <Input defaultValue="not-an-email" />
            </Field>
            <Field label="Disabled">
              <Input disabled defaultValue="Read only" />
            </Field>
            <Field label="Biography" hint="A paragraph, not a CV.">
              <Textarea placeholder="Write something…" />
            </Field>
          </div>
        </Block>

        <Block id="choice" title="Checkbox, Radio, Switch">
          <Row label="Checkbox">
            <Checkbox id="c1" checked={checked} onCheckedChange={setChecked} label="Unchecked / checked" />
            <Checkbox id="c2" checked="indeterminate" label="Indeterminate" />
            <Checkbox id="c3" checked disabled label="Disabled" />
          </Row>
          <Row label="Radio">
            <RadioGroup defaultValue="all" className="flex-row gap-[var(--spacing-5)]">
              <Radio value="all" id="r1" label="Everyone" />
              <Radio value="mentors" id="r2" label="Mentors only" hint="Accepting requests" />
              <Radio value="none" id="r3" label="Disabled" disabled />
            </RadioGroup>
          </Row>
          <Row label="Switch">
            <Switch id="s1" checked={switched} onCheckedChange={setSwitched} label="Publish immediately" />
            <Switch id="s2" disabled label="Disabled" />
          </Row>
        </Block>

        <Block id="pickers" title="Select, Combobox">
          <div className="grid max-w-[40rem] gap-[var(--spacing-5)] md:grid-cols-2">
            <Field label="Sort by">
              <Select defaultValue="name">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="recent">Recently added</SelectItem>
                  <SelectItem value="city">City</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Field of work" hint="Type to filter.">
              <Combobox options={OPTIONS} value={combo} onChange={setCombo} />
            </Field>
          </div>
        </Block>

        <Block id="overlays" title="Dialog, Sheet, Popover, Tooltip, Toast">
          <Row label="Overlays">
            <Dialog>
              <DialogTrigger asChild><Button>Open dialog</Button></DialogTrigger>
              <DialogContent title="Remove Śrīvāsa Ṭhākura?" description="This archives the profile. It can be restored.">
                <p className="text-sm text-ink-muted">The profile stops appearing in the directory immediately.</p>
                <DialogFooter>
                  <Button>Cancel</Button>
                  <Button variant="danger">Archive profile</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Sheet>
              <SheetTrigger asChild><Button>Open sheet</Button></SheetTrigger>
              <SheetContent title="Filters" description="Narrow the directory.">
                <p className="text-sm text-ink-muted">Filter controls go here.</p>
              </SheetContent>
            </Sheet>

            <Popover>
              <PopoverTrigger asChild><Button>Open popover</Button></PopoverTrigger>
              <PopoverContent>
                <p className="text-sm text-ink-muted">A popover holds secondary controls, not primary content.</p>
              </PopoverContent>
            </Popover>

            <Tooltip content="Tooltips never hold essential information.">
              <Button variant="ghost">Hover me</Button>
            </Tooltip>

            <Button onClick={() => toast({ title: 'Profile approved', description: 'Śrīvāsa is now in the directory.', tone: 'success' })}>
              Toast: success
            </Button>
            <Button onClick={() => toast({ title: 'Could not save', description: 'The connection dropped.', tone: 'danger' })}>
              Toast: error
            </Button>
          </Row>
        </Block>

        <Block id="display" title="Badge, Avatar, Skeleton, Tabs">
          <Row label="Badge">
            <Badge>Neutral</Badge>
            <Badge tone="accent">Accent</Badge>
            <Badge tone="success">Approved</Badge>
            <Badge tone="warning">Pending</Badge>
            <Badge tone="danger">Rejected</Badge>
            <Badge tone="outline">Outline</Badge>
          </Row>
          <Row label="Avatar — initials fallback, never a generated face">
            <Avatar name="Śrīvāsa Ṭhākura" size="xs" />
            <Avatar name="Priya Sharma" size="sm" />
            <Avatar name="David Chen" size="md" />
            <Avatar name="Arvind Ramesh" size="lg" />
            <Avatar name="Anna" size="xl" shape="square" />
          </Row>
          <Row label="Skeleton">
            <div className="flex w-full max-w-[24rem] flex-col gap-[var(--spacing-2)]">
              <Skeleton className="h-[var(--spacing-6)] w-1/3" />
              <Skeleton className="h-[var(--spacing-4)] w-full" />
              <Skeleton className="h-[var(--spacing-4)] w-2/3" />
            </div>
          </Row>
          <Row label="Tabs">
            <Tabs defaultValue="upcoming" className="w-full">
              <TabsList>
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="past">Past</TabsTrigger>
                <TabsTrigger value="draft" disabled>Drafts</TabsTrigger>
              </TabsList>
              <TabsContent value="upcoming"><p className="text-sm text-ink-muted">Upcoming events.</p></TabsContent>
              <TabsContent value="past"><p className="text-sm text-ink-muted">Past events.</p></TabsContent>
            </Tabs>
          </Row>
        </Block>

        <Block id="table" title="Table, Pagination">
          <TableWrapper>
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell sort={sort} onSort={() => setSort(sort === 'asc' ? 'desc' : 'asc')}>Name</TableHeaderCell>
                  <TableHeaderCell>Field</TableHeaderCell>
                  <TableHeaderCell>City</TableHeaderCell>
                  <TableHeaderCell align="end">Members</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {[['Śrīvāsa Ṭhākura', 'Medicine', 'Mumbai', 38],
                  ['Priya Sharma', 'Public service', 'Delhi', 27],
                  ['David Chen', 'Engineering', 'San Francisco', 112]].map(([n, f, c, v]) => (
                  <TableRow key={String(n)}>
                    <TableCell className="text-ink">{n}</TableCell>
                    <TableCell>{f}</TableCell>
                    <TableCell>{c}</TableCell>
                    <TableCell align="end">{v}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableWrapper>
          <Pagination
            className="mt-[var(--spacing-4)]"
            hasPrevious={false}
            hasNext
            onPrevious={() => {}}
            onNext={() => {}}
            summary="1–3 of 212"
          />
        </Block>

        <Block id="patterns" title="Patterns">
          <Row label="FilterBar">
            <FilterBar
              className="w-full"
              query={query}
              onQueryChange={setQuery}
              placeholder="Search the directory"
              activeFilterCount={query ? 1 : 0}
              onClear={() => setQuery('')}
              trailing={<Badge tone="outline">212 members</Badge>}
            />
          </Row>

          <Row label="Cards">
            <div className="grid w-full gap-[var(--spacing-4)] md:grid-cols-2 lg:grid-cols-3">
              <MemberCard href="#" name="Śrīvāsa Ṭhākura" headline="Consultant cardiologist, Kokilaben Hospital" location="Mumbai, India" tags={['Medicine', 'Mentor']} />
              <MemberCard href="#" name="Priya Sharma" headline="District Magistrate" location="Delhi, India" status="pending" />
              <EventCard href="#" title="Annual gathering" startsAt={new Date('2026-11-14T13:00:00Z')} timeZone="Asia/Kolkata" venue="ISKCON Juhu, Mumbai" mode="HYBRID" />
            </div>
          </Row>

          <Row label="StoryCard">
            <div className="w-full max-w-[40rem]">
              <StoryCard href="#" title="What the register is for" excerpt="A directory is only as good as the reason people open it." author="Editorial" publishedAt={new Date('2026-08-02T00:00:00Z')} />
            </div>
          </Row>

          <Row label="EmptyState">
            <EmptyState
              className="w-full"
              icon={<Users className="size-[var(--spacing-7)]" />}
              title="No members match those filters"
              description="Try widening the field of work, or search by city instead."
              action={<Button variant="primary">Clear filters</Button>}
              suggestions={<><Badge tone="outline">Medicine</Badge><Badge tone="outline">Mumbai</Badge><Badge tone="outline">Mentors</Badge></>}
            />
          </Row>

          <Row label="ErrorState">
            <ErrorState className="w-full" onRetry={() => {}} reference="a1b2c3d4" />
          </Row>

          <Row label="Prose">
            <Prose>
              <h2>A measure that can be read</h2>
              <p>Body copy is capped at 66 characters. Past that the eye loses the start of the next line, which is the most common reason a text page feels tiring without looking wrong.</p>
              <blockquote>Authority is demonstrated by what you leave out.</blockquote>
              <p>Devanagari renders in its own face: <span lang="sa">श्रीमद्भागवतम्</span>, alongside IAST — Śrīmad Bhāgavatam.</p>
            </Prose>
          </Row>
        </Block>

        <Command
          open={paletteOpen}
          onOpenChange={setPaletteOpen}
          items={[
            { id: 'directory', label: 'Go to directory', group: 'Navigate', icon: <Users className="size-[var(--spacing-4)]" />, shortcut: 'G D', onSelect: () => {} },
            { id: 'events', label: 'Go to events', group: 'Navigate', icon: <Calendar className="size-[var(--spacing-4)]" />, onSelect: () => {} },
            { id: 'search', label: 'Search members', group: 'Actions', icon: <Search className="size-[var(--spacing-4)]" />, onSelect: () => {} },
            { id: 'disabled', label: 'Unavailable action', group: 'Actions', disabled: true, onSelect: () => {} },
          ]}
        />
      </Section>
    </TooltipProvider>
  );
}
