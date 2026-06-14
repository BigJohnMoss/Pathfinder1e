package crc64d6358e7bf64fbac4;


public class SpeechToTextImplementation_SpeechRecognitionListener
	extends java.lang.Object
	implements
		mono.android.IGCUserPeer,
		android.speech.RecognitionListener
{

	public SpeechToTextImplementation_SpeechRecognitionListener ()
	{
		super ();
		if (getClass () == SpeechToTextImplementation_SpeechRecognitionListener.class) {
			mono.android.TypeManager.Activate ("CommunityToolkit.Maui.Media.SpeechToTextImplementation+SpeechRecognitionListener, CommunityToolkit.Maui.Core", "", this, new java.lang.Object[] {  });
		}
	}

	public void onBeginningOfSpeech ()
	{
		n_onBeginningOfSpeech ();
	}

	private native void n_onBeginningOfSpeech ();

	public void onBufferReceived (byte[] p0)
	{
		n_onBufferReceived (p0);
	}

	private native void n_onBufferReceived (byte[] p0);

	public void onEndOfSpeech ()
	{
		n_onEndOfSpeech ();
	}

	private native void n_onEndOfSpeech ();

	public void onError (int p0)
	{
		n_onError (p0);
	}

	private native void n_onError (int p0);

	public void onEvent (int p0, android.os.Bundle p1)
	{
		n_onEvent (p0, p1);
	}

	private native void n_onEvent (int p0, android.os.Bundle p1);

	public void onPartialResults (android.os.Bundle p0)
	{
		n_onPartialResults (p0);
	}

	private native void n_onPartialResults (android.os.Bundle p0);

	public void onReadyForSpeech (android.os.Bundle p0)
	{
		n_onReadyForSpeech (p0);
	}

	private native void n_onReadyForSpeech (android.os.Bundle p0);

	public void onResults (android.os.Bundle p0)
	{
		n_onResults (p0);
	}

	private native void n_onResults (android.os.Bundle p0);

	public void onRmsChanged (float p0)
	{
		n_onRmsChanged (p0);
	}

	private native void n_onRmsChanged (float p0);

	public void onEndOfSegmentedSession ()
	{
		n_onEndOfSegmentedSession ();
	}

	private native void n_onEndOfSegmentedSession ();

	public void onLanguageDetection (android.os.Bundle p0)
	{
		n_onLanguageDetection (p0);
	}

	private native void n_onLanguageDetection (android.os.Bundle p0);

	public void onSegmentResults (android.os.Bundle p0)
	{
		n_onSegmentResults (p0);
	}

	private native void n_onSegmentResults (android.os.Bundle p0);

	private java.util.ArrayList refList;
	public void monodroidAddReference (java.lang.Object obj)
	{
		if (refList == null)
			refList = new java.util.ArrayList ();
		refList.add (obj);
	}

	public void monodroidClearReferences ()
	{
		if (refList != null)
			refList.clear ();
	}
}
