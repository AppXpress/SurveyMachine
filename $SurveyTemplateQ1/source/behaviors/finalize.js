/**
 * Created by areynolds on 8/12/2015.
 */
//Clean data on departure of page -> no need to save any changes made on template

/*
Facade.Behaviors.Page.forPage("SurveyReview").onDestroy(function(behaviorFn, args) {
    var data = Facade.PageRegistry.getPrimaryData();
    data.resetClean();
});
*/

// show radio set field if it is a boolean or multichoice question
Facade.Components.Field.forName("radioSetField").setMask(function(behaviorFn, args) {
    var questionText = this.getPathData().get('questionType');
    if (questionText === "BOOL" || questionText == "CHOICE") {
        return Facade.Constants.Mask.NORMAL;
    }
    return Facade.Constants.Mask.HIDDEN;
});


Facade.Components.Radio.forKind('radiobtn').setMask(function(behaviorFn, args) {
    var opts = this.getPathData().get('answerOptions');
    var questionText = this.getPathData().get('questionType');
    var index = this.getValue().getRaw();
    if (questionText == 'BOOL') {
        if (index < 2) {
            return Facade.Constants.Mask.NORMAL;
        }
    }

    return opts && opts.get(index) ? Facade.Constants.Mask.NORMAL : Facade.Constants.Mask.HIDDEN;
});

//Set radio button labels to answer options
Facade.FunctionRegistry.register("page.radiobtn.setLabel", function(behaviorFn, args) {
    var label = this.getPathData().get('answerOptions');
    var questionText = this.getPathData().get('questionType');
    var index = this.getValue().data;
    //If a boolean question -> return yes or no
    if (questionText == "BOOL") {
        if (index == 0) {
            return 'yes';
        }
        if (index == 1) {
            return 'no';
        }
        return null;
    }
    return label.get(index) ? label.get(index).get('answerText') : null;
});

// show if question is selection type
Facade.Components.Field.forName("checkboxSet").setMask(function(behaviorFn, args) {
    var questionText = this.getPathData().get('questionType');
    return questionText == "SELECT" ? Facade.Constants.Mask.NORMAL : Facade.Constants.Mask.HIDDEN;
});

//Show checkbox only if there is an answer option
Facade.Components.Radio.forKind('answerCheckbox').setMask(function(behaviorFn, args) {
    var opts = this.getPathData().get('answerOptions');
    var index = this.getItemSelectionName();
    return opts.get(index) ? Facade.Constants.Mask.NORMAL : Facade.Constants.Mask.HIDDEN;

});

//Set checkbox label to answer option text
Facade.FunctionRegistry.register("page.checkbox.setLabel", function(behaviorFn, args) {
    var label = this.getPathData().get('answerOptions');
    var index = this.getItemSelectionName();
    return label.get(index) ? label.get(index).get('answerText') : null;
});

var myBtnBar = Facade.Components.Docbar.forKind("SurveyReview").buttonbar()
myBtnBar.setButtons(["back", "finish"]);
myBtnBar.button('back').navigateToPage("SurveyIncomplete");
myBtnBar.button('back').setLabel("Edit Survey");
myBtnBar.button('finish').setLabel("Submit Survey");
myBtnBar.button('finish').setOnClick(function() {
    if (Facade.FunctionRegistry.execute('validateSurvey')) {
        Facade.PageRegistry.transition("wf_finalize").then(function() {
            Facade.PageRegistry.setCurrent("SurveyIncomplete");
        },function(){
            Facade.PageRegistry.alert('Transition did not work. Try again');
        });
    }
});
myBtnBar.button('finish').setMask(function(){
    var template = Facade.PageRegistry.getPrimaryData();
    return template.get('state') == 'complete' ? Facade.Constants.Mask.HIDDEN : Facade.Constants.Mask.NORMAL;
});

Facade.FunctionRegistry.register('validateSurvey', function() {
    var survey = Facade.PageRegistry.getPrimaryData();
    var questionList = survey.get('questionList');
    if (!questionList) {
        Facade.PageRegistry.alert("Must have atleast one question to have a valid survey. ")
        return false;
    }
    var len = questionList.getLength();
    for (var i = 0; i < len; i++) {
        var answerOptions = questionList.get(i).get('answerOptions');
        var type = questionList.get(i).get('questionType');
        if (type == 'CHOICE' || type == 'SELECT') {
            if (answerOptions.getLength() < 2) {
                Facade.PageRegistry.alert('One or more of your multiple select/multiple choice questions only have 1 answer option. ' +
                    'A valid survey must have two or more answer options for these types of questions!');
                return false;
            }
        }
        if(!type){
            Facade.PageRegistry.alert('You have a question that does not have a question type. Must be corrected in order to complete survey');
            return false;
        }
    }
    return true;
});

//Sets height of textbox according to question type
Facade.FunctionRegistry.register('getFieldHeight', function() {
    var questionType = this.getPathData().getParentPathData().get('questionType');
    return questionType == "OPEN" ? 5 : 1;
});

//Sets mask of field depending on question type
Facade.FunctionRegistry.register("page.responseText.setMask", function(behaviorFn, args) {
    var questionType = this.getPathData().getParentPathData().get('questionType');
    if (questionType == "FIB" || questionType == "OPEN") {
        return Facade.Constants.Mask.NORMAL;
    }
    return Facade.Constants.Mask.HIDDEN;
});

Facade.FunctionRegistry.register('orderedListFn', function(behaviorFn,args) {
    var index = parseInt(behaviorFn.components.listItem.$internals.attrs.field) + 1 ;
    return  index.toString() + ". ";
});

Facade.Components.Button.forName('submit').setEnabled( false );