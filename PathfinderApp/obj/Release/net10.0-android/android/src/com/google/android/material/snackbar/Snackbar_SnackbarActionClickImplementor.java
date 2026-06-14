package com.google.android.material.snackbar;


public class Snackbar_SnackbarActionClickImplementor
	extends java.lang.Object
	implements
		mono.android.IGCUserPeer,
		android.view.View.OnClickListener
{

	public Snackbar_SnackbarActionClickImplementor ()
	{
		super ();
		if (getClass () == Snackbar_SnackbarActionClickImplementor.class) {
			mono.android.TypeManager.Activate ("Google.Android.Material.Snackbar.Snackbar+SnackbarActionClickImplementor, Xamarin.Google.Android.Material", "", this, new java.lang.Object[] {  });
		}
	}

	public void onClick (android.view.View p0)
	{
		n_onClick (p0);
	}

	private native void n_onClick (android.view.View p0);

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
