let divSelectRoom = document.getElementById("selectRoom")
let divConsultingRoom = document.getElementById("consultingRoom")
let inputRoomNumber = document.getElementById("roomNumber")
let btnGoRoom = document.getElementById("goRoom")
let localVideo = document.getElementById("localVideo")
let remoteVideo = document.getElementById("remoteVideo")

let roomNumber, localStream, remoteStream, rtcPeerConnection, isCaller

const iceServers= {
	'iceServer':[
		{'urls': 'stun:stun.services.mozilla.com'},
		{'urls': 'stun:stun.l.google.com:19302'}
	]
}

const streamConstraints = {
	audio: true,
	video: true
}

const socket = io()

btnGoRoom.onclick = ()=>{
	if(inputRoomNumber.value ===''){
		alert("please input room name")
	} else {
		
		roomNumber = inputRoomNumber.value
		socket.emit('create or join', roomNumber)
		//console.log("fuck")
		divSelectRoom.style="display:none"
		divConsultingRoom.style="display:block"
	}
}

socket.on('created', room =>{
	console.log('fuck created')
	navigator.mediaDevices.getUserMedia(streamConstraints)
		.then(stream => {
			localStream = stream
			localVideo.srcObject = stream
			isCaller= true
			//console.log("fuck1")
		})
		.catch(err => {
			console.log("an error ocurred", err)
		})

})

socket.on('joined', room =>{
	console.log('fuck joined')
	navigator.mediaDevices.getUserMedia(streamConstraints)
		.then(stream => {
			localStream = stream
			localVideo.srcObject = stream
			socket.emit('ready',roomNumber)
			//console.log("fuck1")
		})
		.catch(err => {
			console.log("an error ocurred", err)
		})

})

socket.on('ready', () =>{
	console.log('fuck ready',isCaller)
	if(isCaller){
		rtcPeerConnection = new RTCPeerConnection(iceServers)
		rtcPeerConnection.onicecandidate=onIceCandidate
		rtcPeerConnection.ontrack = onAddStream
		rtcPeerConnection.addTrack(localStream.getTracks()[0], localStream)
		rtcPeerConnection.addTrack(localStream.getTracks()[1], localStream)
		rtcPeerConnection.createOffer()
			.then(sessionDescription => {
				console.log('sending offer', sessionDescription)
				rtcPeerConnection.setLocalDescription(sessionDescription)
				socket.emit('offer', {
					type: 'offer',
					sdp: sessionDescription,
					room: roomNumber
				})
			})
			.catch(err =>{
				console.log("err is",err)
			})
	}
})

socket.on('offer', event =>{
	console.log('fuck offer')
	if(!isCaller){
		rtcPeerConnection = new RTCPeerConnection(iceServers)
		rtcPeerConnection.onicecandidate=onIceCandidate
		rtcPeerConnection.ontrack = onAddStream
		rtcPeerConnection.addTrack(localStream.getTracks()[0], localStream)
		rtcPeerConnection.addTrack(localStream.getTracks()[1], localStream)
		console.log('received offer', event)
		rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event))
		rtcPeerConnection.createAnswer()
			.then(sessionDescription => {
				console.log('sending answer', sessionDescription)
				rtcPeerConnection.setLocalDescription(sessionDescription)
				socket.emit('answer', {
					type: 'answer',
					sdp: sessionDescription,
					room: roomNumber
				})
			})
			.catch(err =>{
				console.log("err is",err)
			})
	}
})

socket.on('answer', event => {
	console.log('received answer',event)
	rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event))
})

socket.on('candidate',event => {
	console.log('fuck candidate')
	const candidate = new RTCIceCandidate({
		sdpMLineIndex: event.label,
		candidate: event.candidate
	})
	rtcPeerConnection.addIceCandidate(candidate)
})

function onAddStream(event){
	console.log('fuck add stream')
	remoteVideo.srcObject = event.streams[0]
	remoteStream = event.streams[0]
}

function onIceCandidate(event){
	if(event.candidate){
		console.log('sending ice candidate',event.candidate)
		socket.emit('candidate',{
			type: "candidate",
			label: event.candidate.sdpMLineIndex,
			id: event.candidate.sdpMid,
			candidate: event.candidate.candidate,
			room: roomNumber
		})
	}
}