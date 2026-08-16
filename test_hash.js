function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return hash;
}

const keysLength = 200;
console.log("JOB-1111", Math.abs(hashCode("JOB-1111")) % keysLength);
console.log("JOB-2222", Math.abs(hashCode("JOB-2222")) % keysLength);
console.log("JOB-3333", Math.abs(hashCode("JOB-3333")) % keysLength);
console.log("JOB-4444", Math.abs(hashCode("JOB-4444")) % keysLength);
