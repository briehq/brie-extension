(function () {
  'use strict';
  const CORE_VERSION = '0.12.9';
  const CORE_URL = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd/ffmpeg-core.js`;
  var FFMessageType;
  (function (FFMessageType2) {
    FFMessageType2['LOAD'] = 'LOAD';
    FFMessageType2['EXEC'] = 'EXEC';
    FFMessageType2['FFPROBE'] = 'FFPROBE';
    FFMessageType2['WRITE_FILE'] = 'WRITE_FILE';
    FFMessageType2['READ_FILE'] = 'READ_FILE';
    FFMessageType2['DELETE_FILE'] = 'DELETE_FILE';
    FFMessageType2['RENAME'] = 'RENAME';
    FFMessageType2['CREATE_DIR'] = 'CREATE_DIR';
    FFMessageType2['LIST_DIR'] = 'LIST_DIR';
    FFMessageType2['DELETE_DIR'] = 'DELETE_DIR';
    FFMessageType2['ERROR'] = 'ERROR';
    FFMessageType2['DOWNLOAD'] = 'DOWNLOAD';
    FFMessageType2['PROGRESS'] = 'PROGRESS';
    FFMessageType2['LOG'] = 'LOG';
    FFMessageType2['MOUNT'] = 'MOUNT';
    FFMessageType2['UNMOUNT'] = 'UNMOUNT';
  })(FFMessageType || (FFMessageType = {}));
  const ERROR_UNKNOWN_MESSAGE_TYPE = new Error('unknown message type');
  const ERROR_NOT_LOADED = new Error('ffmpeg is not loaded, call `await ffmpeg.load()` first');
  const ERROR_IMPORT_FAILURE = new Error('failed to import ffmpeg-core.js');
  let ffmpeg;
  const load = async ({ coreURL: _coreURL, wasmURL: _wasmURL, workerURL: _workerURL }) => {
    const first = !ffmpeg;
    try {
      if (!_coreURL) _coreURL = CORE_URL;
      importScripts(_coreURL);
    } catch {
      if (!_coreURL || _coreURL === CORE_URL) _coreURL = CORE_URL.replace('/umd/', '/esm/');
      self.createFFmpegCore = (
        await import(
          /* @vite-ignore */
          _coreURL
        )
      ).default;
      if (!self.createFFmpegCore) {
        throw ERROR_IMPORT_FAILURE;
      }
    }
    const coreURL = _coreURL;
    const wasmURL = _wasmURL ? _wasmURL : _coreURL.replace(/.js$/g, '.wasm');
    const workerURL = _workerURL ? _workerURL : _coreURL.replace(/.js$/g, '.worker.js');
    ffmpeg = await self.createFFmpegCore({
      // Fix `Overload resolution failed.` when using multi-threaded ffmpeg-core.
      // Encoded wasmURL and workerURL in the URL as a hack to fix locateFile issue.
      mainScriptUrlOrBlob: `${coreURL}#${btoa(JSON.stringify({ wasmURL, workerURL }))}`,
    });
    ffmpeg.setLogger(data => self.postMessage({ type: FFMessageType.LOG, data }));
    ffmpeg.setProgress(data =>
      self.postMessage({
        type: FFMessageType.PROGRESS,
        data,
      }),
    );
    return first;
  };
  const exec = ({ args, timeout = -1 }) => {
    ffmpeg.setTimeout(timeout);
    ffmpeg.exec(...args);
    const ret = ffmpeg.ret;
    ffmpeg.reset();
    return ret;
  };
  const ffprobe = ({ args, timeout = -1 }) => {
    ffmpeg.setTimeout(timeout);
    ffmpeg.ffprobe(...args);
    const ret = ffmpeg.ret;
    ffmpeg.reset();
    return ret;
  };
  const writeFile = ({ path, data }) => {
    ffmpeg.FS.writeFile(path, data);
    return true;
  };
  const readFile = ({ path, encoding }) => ffmpeg.FS.readFile(path, { encoding });
  const deleteFile = ({ path }) => {
    ffmpeg.FS.unlink(path);
    return true;
  };
  const rename = ({ oldPath, newPath }) => {
    ffmpeg.FS.rename(oldPath, newPath);
    return true;
  };
  const createDir = ({ path }) => {
    ffmpeg.FS.mkdir(path);
    return true;
  };
  const listDir = ({ path }) => {
    const names = ffmpeg.FS.readdir(path);
    const nodes = [];
    for (const name of names) {
      const stat = ffmpeg.FS.stat(`${path}/${name}`);
      const isDir = ffmpeg.FS.isDir(stat.mode);
      nodes.push({ name, isDir });
    }
    return nodes;
  };
  const deleteDir = ({ path }) => {
    ffmpeg.FS.rmdir(path);
    return true;
  };
  const mount = ({ fsType, options, mountPoint }) => {
    const str = fsType;
    const fs = ffmpeg.FS.filesystems[str];
    if (!fs) return false;
    ffmpeg.FS.mount(fs, options, mountPoint);
    return true;
  };
  const unmount = ({ mountPoint }) => {
    ffmpeg.FS.unmount(mountPoint);
    return true;
  };
  self.onmessage = async ({ data: { id, type, data: _data } }) => {
    const trans = [];
    let data;
    try {
      if (type !== FFMessageType.LOAD && !ffmpeg) throw ERROR_NOT_LOADED;
      switch (type) {
        case FFMessageType.LOAD:
          data = await load(_data);
          break;
        case FFMessageType.EXEC:
          data = exec(_data);
          break;
        case FFMessageType.FFPROBE:
          data = ffprobe(_data);
          break;
        case FFMessageType.WRITE_FILE:
          data = writeFile(_data);
          break;
        case FFMessageType.READ_FILE:
          data = readFile(_data);
          break;
        case FFMessageType.DELETE_FILE:
          data = deleteFile(_data);
          break;
        case FFMessageType.RENAME:
          data = rename(_data);
          break;
        case FFMessageType.CREATE_DIR:
          data = createDir(_data);
          break;
        case FFMessageType.LIST_DIR:
          data = listDir(_data);
          break;
        case FFMessageType.DELETE_DIR:
          data = deleteDir(_data);
          break;
        case FFMessageType.MOUNT:
          data = mount(_data);
          break;
        case FFMessageType.UNMOUNT:
          data = unmount(_data);
          break;
        default:
          throw ERROR_UNKNOWN_MESSAGE_TYPE;
      }
    } catch (e) {
      self.postMessage({
        id,
        type: FFMessageType.ERROR,
        data: e.toString(),
      });
      return;
    }
    if (data instanceof Uint8Array) {
      trans.push(data.buffer);
    }
    self.postMessage({ id, type, data }, trans);
  };
})();
//# sourceMappingURL=worker-D3WqxKMJ.js.map
