//This is Controller for Dialog box.
appControllers.controller('DialogController', function ($scope, $mdDialog, displayOption) {

    //This variable for display wording of dialog.
    //object schema:
    //displayOption: {
    //        title: "Confirm to remove all data?",
    //        content: "All data will remove from local storage.",
    //        ok: "Confirm",
    //        cancel: "Close"
    //}
    $scope.displayOption = displayOption;

    $scope.cancel = function () {
        $mdDialog.cancel(); //close dialog.
    };

    $scope.ok = function () {
        $mdDialog.hide();//hide dialog.
    };
});// End Controller for Dialog box.

//Controller for Toast.
appControllers.controller('toastController', function ($scope, displayOption) {

    //this variable for display wording of toast.
    //object schema:
    // displayOption: {
    //    title: "Data Saved !"
    //}

    $scope.displayOption = displayOption;
});// End Controller for Toast.

