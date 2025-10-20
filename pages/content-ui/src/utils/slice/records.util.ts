export const getRecords = () => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'GET_RECORDS' }, response => {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message));
      }

      resolve(response.records);
    });
  });
};

export const deleteRecords = () => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'DELETE_RECORDS' }, response => {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message));
      }

      resolve(response.records);
    });
  });
};
