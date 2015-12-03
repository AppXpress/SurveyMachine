//Initialize a new design to show answer options. Design will only have one field, holding an answer option
Facade.Behaviors.App.preLoad(function(behaviorFn, args) {

});

Facade.Behaviors.App.onLoad(function(behaviorFn,args){
    var myData = Facade.PageRegistry.getPrimaryData();
    if( myData.get('questionList')){
        var questionListDesign = myData.get('questionList').getDesign();
        questionListDesign.addVirtualField("answerOptionText", function(){
            var questionType = this.get('questionType');
            switch(questionType){
                case "FIB":
                    return "Short Text";
                case "OPEN":
                    return "Text section";
                case "BOOL":
                    return "Yes or no";
                case "CHOICE":
                case "SELECT":
                    return "Should not be shown";
                default:
                    return "";
            }
        })
    }
});

//On page start up, map answer options into clientAnswerList to display nicely in a table
//NOTE: if you just display a dataList or a core-list within a table this would be unnecessary
//and the clientAnswerList field would not need to be used
Facade.Behaviors.Page.forPage("SurveyIncomplete").onLoad(function(behaviorFn, args) {

});

Facade.Behaviors.Page.onLoad(function(behaviorFn, args) {

});


var docBarButtonbar = Facade.Components.Docbar.buttonbar();
docBarButtonbar.appendButtons(["review"]);
var btn = docBarButtonbar.button('review');
btn.navigateToPage("SurveyReview");
btn.setLabel("Preview Survey");
btn.setEnabled(function(behaviorFn) {
    return (! Facade.PageRegistry.getPrimaryData().isDirty() );
});

//Hack to hide actions button from view
//Better way to do this to make it more stable - want to disable the finalize transition
//from this page
docBarButtonbar.button('actionsButton').setMask(Facade.Constants.Mask.HIDDEN);
docBarButtonbar.button('wf_finalize').setMask(Facade.Constants.Mask.HIDDEN);
docBarButtonbar.button('edit').setMask(function(behaviorFn) {
    var data = Facade.PageRegistry.getPrimaryData();
    if( data.get('state') == 'complete'){
        return Facade.Constants.Mask.HIDDEN;
    }
    return behaviorFn.resume();
});
docBarButtonbar.button('save').setMask(function() {
    var data = Facade.PageRegistry.getPrimaryData();
    if (data.get('state') == 'incomplete' || data.isNew() ) {
        return Facade.Constants.Mask.NORMAL;
    }
    return Facade.Constants.Mask.HIDDEN;
})


var tableContainer = Facade.Components.Table.forName("surveyQuestions");
tableContainer.itemAddButton().setMask(Facade.Constants.Mask.HIDDEN);
tableContainer.row().checkboxSelection().setMask(function() {
    return Facade.PageRegistry.inEditMode() ? Facade.Constants.Mask.NORMAL : Facade.Constants.Mask.HIDDEN;
});

Facade.Components.Button.forName("addAnotherQuestion").setOnClick(function(behaviorFn, args) {
    Facade.PageRegistry.getComponent("surveyQuestions").addItem();
});

//Add another row!
Facade.Components.Button.forName('addAnswerOption').setOnClick(function(behaviorFn,args){
    var myRowData = this.getPathData();
    var myAnswerOptions = myRowData.get('answerOptions');
    if(myAnswerOptions){
        myAnswerOptions.push(new Facade.Prototypes.Data({}));
    }
    else{
        myRowData.set('answerOptions', new Facade.Prototypes.DataList([], { "type" : "$AnswerQ1"}));
        myRowData.get('answerOptions').push(new Facade.Prototypes.Data({}));
        myRowData.get('answerOptions').push(new Facade.Prototypes.Data({}));
    }

});

Facade.FunctionRegistry.register('deleteAnswerOption', function() {
    this.getPathData().remove();
});


Facade.FunctionRegistry.register("isMultiselectQuestionFn", function(behaviorFn,args){
    var questionType = this.getPathData().getParentPathData().get('questionType');
    if( questionType == "SELECT" || questionType == "CHOICE" ){
        return Facade.Constants.Mask.NORMAL;
    }
    return Facade.Constants.Mask.HIDDEN;
});

Facade.FunctionRegistry.register("isMultiselectQuestionButtonFn", function(behaviorFn,args){
    var questionType = this.getPathData().get('questionType');
    if( ( questionType == "SELECT" || questionType == "CHOICE") &&
        Facade.PageRegistry.inEditMode() ){
        return Facade.Constants.Mask.NORMAL;
    }
    return Facade.Constants.Mask.HIDDEN;
});

Facade.FunctionRegistry.register("isNotMultiselectQuestionFn", function(behaviorFn,args){
    var questionType = this.getPathData().get('questionType');
    if( questionType == "SELECT" || questionType == "CHOICE"){
        return Facade.Constants.Mask.HIDDEN;
    }
    return Facade.Constants.Mask.NORMAL;
});

Facade.FunctionRegistry.register("answerOptionLabelFn",function(behaviorFn,args){
    return this.getPathData().get('answerOptionText');
});

////

Facade.FunctionRegistry.register("#surveyQuestions.defaultField.#picklist.#dropdown.selectionName", function(behaviorFn,args){
    var pop = Facade.PageRegistry.getComponent("confirmMessagePopover");
    //pop.show();
    console.log('onChange');
});

var current_index;
Facade.FunctionRegistry.register("#surveyQuestions.#questionType.onChange", function(behaviorFn,args){
    var myRowData = this.getPathData().getParentPathData();
    var questionType = myRowData.get('questionType');
    current_index = behaviorFn.components.tableRow._name;

    if(questionType == "SELECT" || questionType == "CHOICE"){
        var myAnswerOptions = myRowData.get('answerOptions');
        if( ! myAnswerOptions ){
            myRowData.set('answerOptions', new Facade.Prototypes.DataList([], { "type" : "$AnswerQ1"}));
            myRowData.get('answerOptions').push(new Facade.Prototypes.Data({}));
            myRowData.get('answerOptions').push(new Facade.Prototypes.Data({}));
        }
    }
    else{
        var myAnswerOptions = myRowData.get('answerOptions');
        if( myAnswerOptions ){
           myRowData.set('answerOptions',undefined);
        }
    }
});

var confirmationPopoverBtnBar = Facade.Components.Popover.forName("confirmMessagePopover").buttonbar();
//confirmationPopoverBtnBar.setButtons(['No','Yes']);
confirmationPopoverBtnBar.button('submit').setOnClick(function(){
    console.log('yes');
});
confirmationPopoverBtnBar.button('close').setOnClick(function(){
    console.log(current_index);

});