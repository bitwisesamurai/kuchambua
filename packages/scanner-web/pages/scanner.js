import { useState, useEffect, useRef } from "react";

import Tesseract from "tesseract.js";

import classNames from "classnames";
import styles from "./scanner.module.scss";

const Scanner = () => {
  const [buttonTakePictureDisabled, setButtonTakePictureDisabled] =
    useState(true);
  const [downloadPicture, setDownloadPicture] = useState(false);
  const [uploadFilename, setUploadFilename] = useState();
  const [text, setText] = useState();

  useEffect(async () => {
    // Prompt the user for permission to use the video camera
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    const { current: video } = videoRef;

    video.srcObject = stream;

    video.play();

    setButtonTakePictureDisabled(false);
  }, []);

  const videoRef = useRef();
  const fileInputRef = useRef();
  const canvasRef = useRef();

  const handleFileChange = async (e) => {
    const { target } = e;
    const files = target.files;

    if (files && files.length) {
      const file = files[0];

      setUploadFilename(file.name);

      const loadFile = (reader, file) =>
        new Promise((resolve, reject) => {
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
        });
      const imageDimensions = (file) =>
        new Promise((resolve, reject) => {
          const image = new Image();
          const objectURL = URL.createObjectURL(file);

          image.onload = function () {
            URL.revokeObjectURL(objectURL);

            resolve({ width: this.width, height: this.height });
          };
          image.onerror = reject;

          image.src = objectURL;
        });

      const reader = new FileReader();

      const fileContents = await loadFile(reader, file);
      const { width, height } = await imageDimensions(file);

      const ctx = await drawImage(fileContents, width, height);

      // TODO: Call recognize (i.e. Try to recognize the text in the image)
    }
  };

  const takePicture = async () => {
    const ctx = videoToCanvas();

    recognize(ctx);

    if (downloadPicture) {
      const blob = await canvasToBlob();

      download(blob);
    }
  };

  const drawImage = (url, width, height) =>
    new Promise((resolve, reject) => {
      const { current: canvas } = canvasRef;

      const ctx = canvas.getContext("2d");
      const image = new Image(width, height);

      image.src = url;
      image.crossOrigin = "Anonymous";

      image.onload = () => {
        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(image, 0, 0);

        resolve(ctx);
      };
      image.onerror = reject;
    });

  const videoToCanvas = () => {
    const { current: canvas } = canvasRef;

    const ctx = canvas.getContext("2d"); // Get canvas' 2D rendering context

    const { current: video } = videoRef;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(video, 0, 0);

    return ctx;
  };

  const recognize = async (ctx) => {
    const canvas = ctx.canvas;
    const src = canvas.toDataURL("image/png");

    const result = await Tesseract.recognize(src, "eng", {
      // TODO: Add a linear progress component to the page and update it in the logger function
      //       instead of logging to the console
      logger: (m) => console.log("[LOGGER]", m),
    });

    setText(result.data.text);
  };

  const canvasToBlob = async () =>
    await new Promise((resolve) => canvasRef.current.toBlob(resolve));

  const download = (blob) => {
    const a = document.createElement("a");
    const objectURL = URL.createObjectURL(blob);

    a.href = objectURL;
    a.download = "screenshot.jpg";

    URL.revokeObjectURL(objectURL);

    document.body.appendChild(a);

    a.click();
    a.remove();
  };

  return (
    <div className={styles.scanner}>
      <div className={styles.content}>
        <video ref={videoRef} />
        <div className={styles.controls}>
          <button disabled={buttonTakePictureDisabled} onClick={takePicture}>
            Take a picture or...
          </button>
          <span>
            <input
              type="checkbox"
              checked={downloadPicture}
              onChange={() => setDownloadPicture(!downloadPicture)}
            />{" "}
            Download the picture?
          </span>
        </div>
        <div className={styles.controls}>
          <input
            type="file"
            multiple={false}
            onChange={handleFileChange}
            ref={fileInputRef}
          />
          <button onClick={() => fileInputRef.current.click()}>
            ...Choose a file
          </button>
          <span
            className={classNames({
              [styles.enabled]: uploadFilename,
              [styles.disabled]: !uploadFilename,
            })}
          >
            {uploadFilename ? uploadFilename : "No file selected"}
          </span>
        </div>
      </div>
      <canvas ref={canvasRef} />
      <textarea value={text} readOnly />
    </div>
  );
};

export default Scanner;
