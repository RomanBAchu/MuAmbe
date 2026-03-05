let localStream;
let peerConnections = {}; // Теперь храним много соединений: { connectionId: pc }
let dotNetHelper;

const config = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' }
    ],
    iceCandidatePoolSize: 10
};

window.prepareWebRTC = async (helper) => {
    dotNetHelper = helper;
    // Сразу запрашиваем камеру при входе
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        document.getElementById('localVideo').srcObject = localStream;
        console.log("Камера готова");
    } catch (e) { console.error("Ошибка камеры:", e); }
};

function createPC(remoteId) {
    if (peerConnections[remoteId]) return peerConnections[remoteId];

    const pc = new RTCPeerConnection(config);

    // Добавляем наши треки этому конкретному участнику
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    pc.onicecandidate = (e) => {
        if (e.candidate) {
            dotNetHelper.invokeMethodAsync('SendIceCandidate', JSON.stringify(e.candidate), remoteId);
        }
    };

    pc.ontrack = (e) => {
        console.log("ПОЛУЧЕН ПОТОК ОТ:", remoteId);
        // Ищем свободный слот для видео (remote1, remote2, remote3)
        for (let i = 1; i <= 3; i++) {
            let videoEl = document.getElementById(`remoteVideo${i}`);

            // Если слот пустой ИЛИ в нем уже сидит этот же человек (бывает дубль треков)
            if (videoEl && (!videoEl.srcObject || videoEl.getAttribute("data-id") === remoteId)) {

                // Фикс для Safari: если streams нет, создаем новый поток из пришедшего трека
                if (e.streams && e.streams[0]) {
                    videoEl.srcObject = e.streams[0];
                } else {
                    videoEl.srcObject = new MediaStream([e.track]);
                }

                videoEl.setAttribute("data-id", remoteId);
                break;
            }
        }
    };


    peerConnections[remoteId] = pc;
    return pc;
}

window.createOffer = async (remoteId) => {
    const pc = createPC(remoteId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    return JSON.stringify(offer);
};

window.processOffer = async (offerJson, remoteId) => {
    const pc = createPC(remoteId);
    await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(offerJson)));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    return JSON.stringify(answer);
};

window.processAnswer = async (ansJson, remoteId) => {
    const pc = peerConnections[remoteId];
    if (pc) await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(ansJson)));
};

window.addIceCandidate = async (candJson, remoteId) => {
    const pc = peerConnections[remoteId];
    if (pc) await pc.addIceCandidate(new RTCIceCandidate(JSON.parse(candJson)));
};
