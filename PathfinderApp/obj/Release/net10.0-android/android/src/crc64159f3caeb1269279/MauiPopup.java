package crc64159f3caeb1269279;


public class MauiPopup
	extends android.app.Dialog
	implements
		mono.android.IGCUserPeer,
		android.content.DialogInterface.OnCancelListener
{

	public MauiPopup (android.content.Context p0)
	{
		super (p0);
		if (getClass () == MauiPopup.class) {
			mono.android.TypeManager.Activate ("CommunityToolkit.Maui.Core.Views.MauiPopup, CommunityToolkit.Maui.Core", "Android.Content.Context, Mono.Android", this, new java.lang.Object[] { p0 });
		}
	}

	public void show ()
	{
		n_show ();
	}

	private native void n_show ();

	public void onCancel (android.content.DialogInterface p0)
	{
		n_onCancel (p0);
	}

	private native void n_onCancel (android.content.DialogInterface p0);

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
