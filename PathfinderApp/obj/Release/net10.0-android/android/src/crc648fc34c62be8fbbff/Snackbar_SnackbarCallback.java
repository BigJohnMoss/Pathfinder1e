package crc648fc34c62be8fbbff;


public class Snackbar_SnackbarCallback
	extends com.google.android.material.snackbar.BaseTransientBottomBar.BaseCallback
	implements
		mono.android.IGCUserPeer
{

	public Snackbar_SnackbarCallback ()
	{
		super ();
		if (getClass () == Snackbar_SnackbarCallback.class) {
			mono.android.TypeManager.Activate ("CommunityToolkit.Maui.Alerts.Snackbar+SnackbarCallback, CommunityToolkit.Maui", "", this, new java.lang.Object[] {  });
		}
	}

	public void onShown (java.lang.Object p0)
	{
		n_onShown (p0);
	}

	private native void n_onShown (java.lang.Object p0);

	public void onDismissed (java.lang.Object p0, int p1)
	{
		n_onDismissed (p0, p1);
	}

	private native void n_onDismissed (java.lang.Object p0, int p1);

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
