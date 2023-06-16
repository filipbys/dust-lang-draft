// TODO create a custom context menu widget:
// - It takes the custom menu items and the target element as input
// - It binds a "contextmenu" listener to it which preventsDefault() *unless* a special flag is set, in which case it clears the flag and then lets the event perform its default
// - It returns a menu with those custom buttons as well as a "open default context menu", which sets the flag and fires another "contextmenu" event.
