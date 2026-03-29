(function() {
  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('finanalytics-offline-db', 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('requests')) {
          db.createObjectStore('requests', { keyPath: 'id', autoIncrement: true });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function enqueueRequest(requestDetails) {
    const db = await openDB();
    const tx = db.transaction('requests', 'readwrite');
    tx.objectStore('requests').add(requestDetails);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  async function syncWithNetwork() {
    const db = await openDB();
    const tx = db.transaction('requests', 'readwrite');
    const store = tx.objectStore('requests');
    const allRequests = await new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    const token = window.APIs?.auth?.getToken?.() || null;

    for (const pending of allRequests) {
      try {
        const response = await fetch(pending.url, {
          method: pending.method,
          headers: {
            ...pending.headers,
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          credentials: 'include',
          body: pending.body
        });

        if (response && response.ok) {
          store.delete(pending.id);
        }
      } catch (err) {
        console.warn('Sync blocked, will retry later', err);
        break;
      }
    }
  }

  function isApiPostForm(form) {
    return ['invoiceForm', 'receiptForm', 'inventoryForm', 'purchaseForm', 'payrollForm'].includes(form.id);
  }

  function getAuthHeaders() {
    const token = window.APIs?.auth?.getToken?.();
    const header = { 'Content-Type': 'application/json' };
    if (token) header['Authorization'] = `Bearer ${token}`;
    return header;
  }

  function getApiBase() {
    return window.FIN_API_BASE_URL || '/api';
  }

  async function handleSubmit(e) {
    const form = e.target;
    if (!isApiPostForm(form)) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    const formData = new FormData(form);
    const payload = {};
    formData.forEach((v,k) => payload[k] = v);

    const endpointMap = {
      invoiceForm: '/invoices',
      receiptForm: '/receipts',
      inventoryForm: '/inventory/products',
      purchaseForm: '/purchases',
      payrollForm: '/payroll'
    };

    const pathname = endpointMap[form.id];
    if (!pathname) return;

    const url = `${getApiBase()}${pathname}`;
    const headers = getAuthHeaders();

    const payloadString = JSON.stringify(payload);

    const queueRequest = async () => {
      await enqueueRequest({ url, method: 'POST', headers, body: payloadString });
      alert('Offline: request queued for sync');
      form.reset();
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        const reg = await navigator.serviceWorker.ready;
        await reg.sync.register('sync-finanalytics-posts');
      }
    };

    if (!navigator.onLine) {
      await queueRequest();
      return;
    }

    try {
      const response = await fetch(url, { method: 'POST', headers, credentials: 'include', body: payloadString });
      if (response.ok) {
        alert('Saved successfully');
        form.reset();
      } else {
        const problem = await response.json().catch(() => ({}));
        await queueRequest();
        console.warn('API rejected, queued for sync', problem);
      }
    } catch (err) {
      console.warn('Network error; queuing', err);
      await queueRequest();
    }
  }

  window.addEventListener('online', () => {
    syncWithNetwork();
  });

  window.addEventListener('load', () => {
    ['invoiceForm', 'receiptForm', 'inventoryForm', 'purchaseForm', 'payrollForm'].forEach(formId => {
      const form = document.getElementById(formId);
      if (form) {
        form.addEventListener('submit', handleSubmit, true);
      }
    });
  });
})();
