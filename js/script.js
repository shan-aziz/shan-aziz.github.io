document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('queryInput');
    const searchBtn = document.getElementById('searchBtn');
    const suggestionsList = document.getElementById('suggestions');
    const startScannerBtn = document.getElementById('startScanner');
    const readerDiv = document.getElementById('reader');
    const statusMsg = document.getElementById('statusMsg');

    // Fixed Google parameters
    const fixedParams = "&sca_esv=7cb5a2c0938f91b5&sxsrf=AE3TifMKO41YI5Cr3emYEt-erq7Jkz15_A%3A1764197479425&source=hp&ei=Z4QnadqbGK2t5NoP3Luq0Qw&iflsig=AOw8s4IAAAAAaSeSd2rrT1IRe8m-7rZhV8gPOfgpArHC&aep=22&udm=50&ved=0ahUKEwia68rg85CRAxWtFlkFHdydKsoQteYPCCU&oq=&gs_lp=Egdnd3Mtd2l6IgBIAFAAWABwAHgAkAEAmAEAoAEAqgEAuAEByAEAmAIAoAIAmAMAkgcAoAcAsgcAuAcAwgcAyAcA&sclient=gws-wiz";

    // Hidden instruction payload
    const breaks = "\n".repeat(6);
    const hiddenInstructionText =
        "%0A%0A%0A%0A%0A%0A" + // six line breaks
        "Return ONLY a clean, structured table. " +
        "Search for the current prices of the specified item across multiple stores (Amazon, CVS Pharmacy, Safeway, Target, Walmart). " +
        "Provide a direct buy link to the product at each store. " +
        "Ensure all products shown are of the same size/volume/weight (e.g., 12oz, 1L, 500g) so they can be compared fairly. " +
        "Sort results by price, cheapest first. " +
        "Table columns: Product Name | Store | Price ($) | Buy Now. " +
        "No preambles, explanations, or extra text—just the table.";


    function buildQuery() {
        const userText = input.value.trim();
        if (!userText) return null;
        const fullQuery = encodeURIComponent(userText) + hiddenInstructionText;
        return fullQuery;
    }


    function doSearch() {
        const encodedQuery = buildQuery();
        if (!encodedQuery) return;
        const url = "https://www.google.com/search?q=" + encodedQuery + fixedParams;

        // clear the text field after redirect
        input.value = "";
        window.location.href = url;
    }

    if (searchBtn) {
        searchBtn.addEventListener('click', doSearch);
    }

    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                doSearch();
            }
        });

        // Google Suggest via JSONP
        input.addEventListener('input', () => {
            const query = input.value.trim();
            suggestionsList.innerHTML = '';
            if (query.length > 0) {
                fetchGoogleSuggestions(query, function (suggestions) {
                    suggestions.forEach(s => {
                        const li = document.createElement('li');
                        li.textContent = s;
                        li.addEventListener('click', () => {
                            input.value = s;
                            suggestionsList.innerHTML = '';
                        });
                        suggestionsList.appendChild(li);
                    });
                });
            }
        });
    }

    function fetchGoogleSuggestions(query, callback) {
        const script = document.createElement('script');
        const callbackName = 'handleSuggestions_' + Math.random().toString(36).slice(2);

        window[callbackName] = function (data) {
            callback(data[1]);
            delete window[callbackName];
            if (script && script.parentNode) script.parentNode.removeChild(script);
        };

        const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}&callback=${callbackName}`;
        script.src = url;
        document.body.appendChild(script);
    }

    // Barcode scanner integration (robust)
    let html5QrCode = null;
    let scannerRunning = false;

    function startScanner() {
        if (scannerRunning) return;
        statusMsg.textContent = "Starting camera…";
        readerDiv.style.display = 'block';

        try {
            html5QrCode = new Html5Qrcode("reader");
        } catch (e) {
            statusMsg.textContent = "Scanner init failed: " + e;
            return;
        }

        html5QrCode.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: 250 },
            async (decodedText) => {
                const upcQuery = "Product UPC code: " + decodedText;
                input.value = upcQuery;
                statusMsg.textContent = "Barcode detected: " + decodedText;

                // Search immediately
                doSearch();

                // Attempt to stop scanner in background
                html5QrCode.stop().then(() => {
                    html5QrCode.clear();
                    scannerRunning = false;
                    readerDiv.style.display = 'none';
                    statusMsg.textContent = "";
                }).catch(err => {
                    console.log("Scanner stop error (ignored):", err);
                });
            },
            (errorMessage) => {
                // Ignore minor scan errors
            }
        ).then(() => {
            scannerRunning = true;
            statusMsg.textContent = "Camera active. Point at a barcode.";
        }).catch(err => {
            scannerRunning = false;
            readerDiv.style.display = 'none';
            statusMsg.textContent = "Camera start failed: " + err;
        });
    }


    function stopScanner() {
        if (!html5QrCode || !scannerRunning) {
            readerDiv.style.display = 'none';
            statusMsg.textContent = "";
            return Promise.resolve();
        }
        return html5QrCode.stop().then(() => {
            html5QrCode.clear();
            scannerRunning = false;
            readerDiv.style.display = 'none';
            statusMsg.textContent = "";
        }).catch(err => {
            scannerRunning = false;
            readerDiv.style.display = 'none';
            statusMsg.textContent = "Stop failed: " + err;
        });
    }

    if (startScannerBtn) {
        startScannerBtn.addEventListener('click', startScanner);
    }

    // Optional: ESC to stop scanner
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            stopScanner();
        }
    });
});
