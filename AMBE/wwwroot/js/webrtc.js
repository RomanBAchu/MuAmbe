let localStream;
let peerConnection;
let dotNetHelper;
let iceCandidatesQueue = [];

// ОБНОВЛЕННЫЙ КОНФИГ: Добавлены TURN серверы для обхода NAT и брандмауэров
const config = {
    iceServers: [
        {
            urls: 'stun:stun.l.google.com:19302'
        },
        {
            // Этот сервер позволит видео работать без VPN
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        },
        {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        }
    ]
};

window.prepareWebRTC = (helper) => {
    dotNetHelper = helper;
    console.log("!!! WebRTC мост установлен !!!");
};

window.startLocalVideo = async (id) => {
    console.log("Включаю камеру...");
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        document.getElementById(id).srcObject = localStream;
    } catch (err) {
        console.error("Ошибка при доступе к камере:", err);
    }
};

function createPC() {
    console.log("Создаю PeerConnection с TURN серверами...");
    peerConnection = new RTCPeerConnection(config);

    if (localStream) {
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    }

    peerConnection.onicecandidate = (e) => {
        if (e.candidate && dotNetHelper) {
            console.log("Отправляю ICE-кандидата...");
            dotNetHelper.invokeMethodAsync('SendIceCandidate', JSON.stringify(e.candidate));
        }
    };

    peerConnection.ontrack = (e) => {
        console.log("ПОЛУЧЕН ВИДЕОПОТОК!");
        const remoteVideo = document.getElementById('remoteVideo');
        if (remoteVideo) {
            remoteVideo.srcObject = e.streams[0];
        }
    };

    peerConnection.oniceconnectionstatechange = () => {
        console.log("Статус соединения:", peerConnection.iceConnectionState);
    };
}

window.createOffer = async () => {
    if (!peerConnection) createPC();
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    return JSON.stringify(offer);
};

window.processOffer = async (offerJson) => {
    if (!peerConnection) createPC();
    await peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(offerJson)));

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    while (iceCandidatesQueue.length > 0) {
        const cand = iceCandidatesQueue.shift();
        await peerConnection.addIceCandidate(cand).catch(e => console.error(e));
    }
    return JSON.stringify(answer);
};

window.processAnswer = async (ansJson) => {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(ansJson)));
};

window.addIceCandidate = async (candJson) => {
    const candidate = new RTCIceCandidate(JSON.parse(candJson));
    if (!peerConnection || !peerConnection.remoteDescription) {
        iceCandidatesQueue.push(candidate);
    } else {
        await peerConnection.addIceCandidate(candidate).catch(e => console.error(e));
    }
};
