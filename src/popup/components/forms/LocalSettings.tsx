import { zodResolver } from '@hookform/resolvers/zod';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import browser, { type Permissions } from 'webextension-polyfill';
import { z } from 'zod';
import { Default as DefaultBalloon } from '@/balloons';
import InfoIcon from '@/components/InfoIcon';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormField,
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectLabel,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { initalConfig } from '@/const';
import log from '@/managers/log';
import storage from '@/managers/storage';
import { askOriginPermissions } from '@/utils';

const MIN_POP_VOLUME = 0;
const VOLUME_STEP = 20;
const MAX_POP_VOLUME = 100;
const MIN_SPAWN_RATE = 0.1;
const MAX_SPAWN_RATE = 1;
const SPAWN_RATE_STEP = 0.1;

const formSchema = z.object({
  popVolume: z.number().int().min(MIN_POP_VOLUME).max(MAX_POP_VOLUME),
  spawnRate: z.number().int().min(MIN_SPAWN_RATE).max(MAX_SPAWN_RATE),
  fullScreenVideoSpawn: z.boolean(),
  snooze: z.number().int().min(0),
  permissions: z.object({
    origins: z.array(z.string()),
    permissions: z.array(z.string()),
  }),
});

const SNOOZE_OPTIONS = [
  { label: '15 minutes', value: 15 * 60 * 1000 },
  { label: '1 hour', value: 1 * 60 * 60 * 1000 },
  { label: '3 hours', value: 3 * 60 * 60 * 1000 },
  { label: '8 hours', value: 8 * 60 * 60 * 1000 },
  { label: '24 hours', value: 24 * 60 * 60 * 1000 },
  { label: 'Until I turn it back on', value: -1 },
];

const ConfigForm = () => {
  const [popVolume, setPopVolume] = useState(initalConfig.popVolume);
  const [spawnRate, setSpawnRate] = useState(initalConfig.spawnRate);
  const [fullScreenVideoSpawn, setFullScreenVideoSpawn] = useState(
    initalConfig.fullScreenVideoSpawn
  );
  const [permissions, setPermissions] = useState<Permissions.AnyPermissions>(
    {}
  );
  const [isSnoozed, setIsSnoozed] = useState(false);
  const [snoozeTimer, setSnoozeTimer] = useState<NodeJS.Timeout | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const popSound = new DefaultBalloon().popSound;

  const onPopVolumeChange = async (popVolume: number) => {
    const config = await storage.sync.get('config');
    await storage.sync.set('config', { ...config, popVolume });
    setPopVolume(popVolume);
    log.debug('Pop volume changed to', popVolume);

    popSound.volume = popVolume / 100;
    popSound.play();
  };

  const onSpawnRateChange = async (spawnRate: number) => {
    const config = await storage.sync.get('config');
    await storage.sync.set('config', { ...config, spawnRate });
    setSpawnRate(spawnRate);
    log.debug('Spawn rate changed to', spawnRate);
  };

  const onFullScreenVideoSpawnChange = async (
    fullScreenVideoSpawn: boolean
  ) => {
    const config = await storage.sync.get('config');
    await storage.sync.set('config', { ...config, fullScreenVideoSpawn });
    setFullScreenVideoSpawn(fullScreenVideoSpawn);
    log.debug('Spawning in full screen video players:', fullScreenVideoSpawn);
  };

  const onGrantOriginPermissionClick = async () => {
    await askOriginPermissions();
    setPermissions(await browser.permissions.getAll());
  };

  const startSnooze = (duration: number) => {
    setIsSnoozed(true);
    setSpawnRate(0);

    if (duration === -1) {
      return;
    }

    const timer = setTimeout(() => {
      setSpawnRate(initalConfig.spawnRate);
      setIsSnoozed(false);
      form.setValue('snooze', 0);
    }, duration);

    setSnoozeTimer(timer);
  };

  const handleSnoozeChange = (selectedDuration: string) => {
    const duration = Number(selectedDuration);
    form.setValue('snooze', duration);
    startSnooze(duration);
  };

  useEffect(() => {
    const loadConfig = async () => {
      const config = await storage.sync.get('config');
      setPopVolume(config.popVolume);
      setSpawnRate(config.spawnRate);
      setFullScreenVideoSpawn(config.fullScreenVideoSpawn);
      setPermissions(await browser.permissions.getAll());
    };

    loadConfig();

    return () => {
      if (snoozeTimer) {
        clearTimeout(snoozeTimer);
      }
    };
  }, [snoozeTimer]);

  return (
    <Form {...form}>
      <form className="grid gap-4">
        <FormField
          control={form.control}
          name="snooze"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex justify-between gap-1">
                <span>Snooze Balloon Spawn</span>
                <InfoIcon>
                  <h4 className="mb-1 font-medium leading-none">
                    Snooze Baloon Spawn
                  </h4>
                  <p className="text-sm font-normal leading-tight text-muted-foreground">
                    Set how long to pause the balloon appearances. During this
                    snooze period, no new balloons will spawn on your screen.
                  </p>
                </InfoIcon>
              </FormLabel>
              <FormControl>
                <Select
                  value={String(field.value)}
                  onValueChange={handleSnoozeChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {SNOOZE_OPTIONS.map((option) => (
                      <SelectItem
                        key={option.label}
                        value={String(option.value)}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="popVolume"
          render={({ field: { onChange } }) => (
            <FormItem>
              <FormLabel className="flex justify-between gap-1">
                <span>Pop Volume</span>
                <span className="flex gap-2">
                  <span className="">{popVolume}</span>
                  <InfoIcon>
                    <h4 className="mb-1 font-medium leading-none">
                      Pop Volume
                    </h4>
                    <p className="text-sm font-normal leading-tight text-muted-foreground">
                      The volume of the pop sound when a balloon is popped.
                    </p>
                  </InfoIcon>
                </span>
              </FormLabel>
              <FormControl>
                <Slider
                  min={MIN_POP_VOLUME}
                  max={MAX_POP_VOLUME}
                  step={VOLUME_STEP}
                  value={[popVolume]}
                  onValueChange={(vals) => {
                    onChange(vals[0]);
                    onPopVolumeChange(vals[0]);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="spawnRate"
          render={({ field: { onChange } }) => (
            <FormItem>
              <FormLabel className="flex justify-between gap-1">
                <span>Spawn Rate</span>
                <span className="flex gap-2">
                  <span className="">x{spawnRate}</span>
                  <InfoIcon>
                    <h4 className="mb-1 font-medium leading-none">
                      Spawn Rate
                    </h4>
                    <p className="text-sm font-normal leading-tight text-muted-foreground">
                      The rate at which balloons spawn. A lower value means less
                      balloons will spawn.
                    </p>
                  </InfoIcon>
                </span>
              </FormLabel>
              <FormControl>
                <Slider
                  min={MIN_SPAWN_RATE}
                  max={MAX_SPAWN_RATE}
                  step={SPAWN_RATE_STEP}
                  value={[spawnRate]}
                  onValueChange={(vals) => {
                    onChange(vals[0]);
                    onSpawnRateChange(vals[0]);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="fullScreenVideoSpawn"
          render={({ field: { onChange } }) => (
            <FormItem>
              <FormLabel>Full-Screen Video Spawn</FormLabel>
              <FormControl>
                <Checkbox
                  checked={fullScreenVideoSpawn}
                  onCheckedChange={(checked: boolean) => {
                    onFullScreenVideoSpawnChange(checked);
                    onChange(checked);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" onClick={() => console.log(form.getValues())}>
          Save
        </Button>
      </form>
    </Form>
  );
};

export default ConfigForm;
