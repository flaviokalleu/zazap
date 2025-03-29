
function forceDownload(blob, filename) {
    var a = document.createElement('a');
    a.download = filename;
    a.href = blob;
    document.body.appendChild(a);
    a.click();
    a.remove();
}

function downloadResource(url, filename) {
    if (!filename) filename = url.split('\\').pop().split('/').pop();
    fetch(url, {
        headers: new Headers({
            'Origin': window.location.origin
        }),
        mode: 'cors'
    })
        .then(response => response.blob())
        .then(blob => {
            let blobUrl = window.URL.createObjectURL(blob);
            forceDownload(blobUrl, filename);
        })
        .catch(e => console.error(e));
}

const insertNineDigitBrazilianPhoneNumber = (number) => {
    if (number.length === 12) {
        return number.slice(0, 4) + '9' + number.slice(4);
    }
    return number;
}


export { downloadResource, insertNineDigitBrazilianPhoneNumber }