let localStream;
let peerConnection;
let dotNetHelper;
let iceCandidatesQueue = []; // Очередь для хранения задержанных кандидатов
const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

window.prepareWebRTC = (helper) => {
    dotNetHelper = helper;
    console.log("!!! WebRTC мост установлен !!!");
};

window.startLocalVideo = async (id) => {
    console.log("Включаю камеру...");
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    document.getElementById(id).srcObject = localStream;
};

function createPC() {
    console.log("Создаю PeerConnection...");
    peerConnection = new RTCPeerConnection(config);
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream)); // Добавляем трек

    peerConnection.onicecandidate = (e) => {
        if (e.candidate && dotNetHelper) {
            console.log("Отправляю ICE-кандидата другу...", e.candidate);
            dotNetHelper.invokeMethodAsync('SendIceCandidate', JSON.stringify(e.candidate));
        }
    };

    peerConnection.ontrack = (e) => {
        console.log("ПОЛУЧЕН ВИДЕОПОТОК ОТ ДРУГА!", e.streams[0]);
        document.getElementById('remoteVideo').srcObject = e.streams[0]; // Показываем чужое видео
    };

    peerConnection.oniceconnectionstatechange = () => {
        console.log("Изменился статус соединения:", peerConnection.iceConnectionState);
    };

    peerConnection.onsignalingstatechange = () => {
        console.log("Изменилось состояние сигнализации:", peerConnection.signalingState);
    };
}

window.createOffer = async () => {
    if (!peerConnection) createPC(); // Создаем соединение, если оно отсутствует
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    console.log("OFFER СОЗДАН И ОТПРАВЛЕН");
    return JSON.stringify(offer);
};

window.processOffer = async (offerJson) => {
    console.log("ПОЛУЧЕН OFFER ОТ ДРУГА, ГОТОВЛЮ ОТВЕТ...");
    if (!peerConnection) createPC(); // Создаем соединение, если оно отсутствует
    await peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(offerJson))); // Применяем OFFER

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer); // Установливаем LOCAL DESCRIPTION

    // Чистка очереди с отложенными кандидатами
    while (iceCandidatesQueue.length > 0) {
        const cand = iceCandidatesQueue.shift();
        await peerConnection.addIceCandidate(cand);
    }
    return JSON.stringify(answer);
};

window.processAnswer = async (ansJson) => {
    console.log("ПОЛУЧЕН ОТВЕТ (ANSWER), СОЕДИНЯЮСЬ...");
    await peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(ansJson)));
};

window.addIceCandidate = async (candJson) => {
    const candidate = new RTCIceCandidate(JSON.parse(candJson));
    if (!peerConnection || !peerConnection.remoteDescription) {
        iceCandidatesQueue.push(candidate); // Кандидат помещается в очередь, если соединение не готово
    } else {
        await peerConnection.addIceCandidate(candidate); // Иначе сразу добавляем кандидата
    }
};