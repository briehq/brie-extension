import { SessionAccessLevelEnum, StorageEnum } from './enums.js';
import type { BaseStorage, StorageConfig, ValueOrUpdate } from './types.js';

// `globalThis.chrome` is undefined when this module is evaluated by tailwindcss's
// `processTailwindFeatures` at build time; downstream calls must tolerate that.
const chrome = globalThis.chrome;

const updateCache = async <D>(valueOrUpdate: ValueOrUpdate<D>, cache: D | null): Promise<D> => {
  const isFunction = <D>(value: ValueOrUpdate<D>): value is (prev: D) => D | Promise<D> => {
    return typeof value === 'function';
  };

  const returnsPromise = <D>(func: (prev: D) => D | Promise<D>): func is (prev: D) => Promise<D> => {
    return (func as (prev: D) => Promise<D>) instanceof Promise;
  };

  if (isFunction(valueOrUpdate)) {
    if (returnsPromise(valueOrUpdate)) {
      return valueOrUpdate(cache as D);
    } else {
      return valueOrUpdate(cache as D);
    }
  } else {
    return valueOrUpdate;
  }
};

// Session access level can only be set once per extension process.
let globalSessionAccessLevelFlag: StorageConfig['sessionAccessForContentScripts'] = false;

const checkStoragePermission = (storageEnum: StorageEnum): void => {
  if (!chrome) {
    return;
  }

  if (chrome.storage[storageEnum] === undefined) {
    throw new Error(`Check your storage permission in manifest.json: ${storageEnum} is not defined`);
  }
};

export const createStorage = <D = string>(key: string, fallback: D, config?: StorageConfig<D>): BaseStorage<D> => {
  let cache: D | null = null;
  let initedCache = false;
  let listeners: Array<() => void> = [];

  const storageEnum = config?.storageEnum ?? StorageEnum.Local;
  const liveUpdate = config?.liveUpdate ?? false;

  const serialize = config?.serialization?.serialize ?? ((v: D) => v);
  const deserialize = config?.serialization?.deserialize ?? (v => v as D);

  if (
    globalSessionAccessLevelFlag === false &&
    storageEnum === StorageEnum.Session &&
    config?.sessionAccessForContentScripts === true
  ) {
    checkStoragePermission(storageEnum);
    chrome?.storage[storageEnum]
      .setAccessLevel({
        accessLevel: SessionAccessLevelEnum.ExtensionPagesAndContentScripts,
      })
      .catch(error => {
        console.warn(error);
        console.warn('Please call setAccessLevel into different context, like a background script.');
      });
    globalSessionAccessLevelFlag = true;
  }

  const get = async (): Promise<D> => {
    checkStoragePermission(storageEnum);
    const value = await chrome?.storage[storageEnum].get([key]);

    if (!value) {
      return fallback;
    }

    // value[key] is typed `unknown` in newer @types/chrome; we always write via
    // `serialize` which returns string, so re-narrowing matches what we wrote.
    return deserialize(value[key] as string) ?? fallback;
  };

  let notifyScheduled = false;
  const _emitChange = () => {
    if (notifyScheduled) return;
    notifyScheduled = true;
    queueMicrotask(() => {
      notifyScheduled = false;
      listeners.forEach(listener => listener());
    });
  };

  const set = async (valueOrUpdate: ValueOrUpdate<D>) => {
    if (!initedCache) {
      cache = await get();
      initedCache = true;
    }
    cache = await updateCache(valueOrUpdate, cache);

    await chrome?.storage[storageEnum].set({ [key]: serialize(cache) });
    _emitChange();
  };

  const subscribe = (listener: () => void) => {
    listeners = [...listeners, listener];

    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  };

  const getSnapshot = () => {
    return cache;
  };

  get().then(data => {
    if (initedCache) return;
    cache = data;
    initedCache = true;
    _emitChange();
  });

  const _updateFromStorageOnChanged = async (changes: { [key: string]: chrome.storage.StorageChange }) => {
    if (changes[key] === undefined) return;

    const valueOrUpdate: ValueOrUpdate<D> = deserialize(changes[key].newValue as string);

    if (cache === valueOrUpdate) return;

    cache = await updateCache(valueOrUpdate, cache);

    _emitChange();
  };

  if (liveUpdate) {
    chrome?.storage[storageEnum].onChanged.addListener(_updateFromStorageOnChanged);
  }

  return {
    get,
    set,
    getSnapshot,
    subscribe,
  };
};
