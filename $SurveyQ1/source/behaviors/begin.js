/**
 * Created by areynolds on 8/12/2015.
 */
var inSubmitMode = false;
var read_only = false;

Facade.Behaviors.App.preLoad(function(){

});

//Set Edit-mode and read-only mode
Facade.Behaviors.App.onLoad(function() {
    var data = Facade.PageRegistry.getPrimaryData();


    if (data.get('state') == 'completed') {
        inSubmitMode = true;
    }

    var assigneeId = data.get('assignee').get('memberId');
    var currentId = Facade.DataRegistry.get('$currentUser').get('organizationUid');

    read_only = (currentId != assigneeId);
});


//Return order with a period before each question in core-text
Facade.FunctionRegistry.register('orderedListFn', function(behaviorFn,args) {
    var index = parseInt(behaviorFn.components.listItem.$internals.attrs.field) + 1 ;
    return  index.toString() + ". ";
});

//On radio click, set the response text to the label
Facade.FunctionRegistry.register('radiobtnClickFn', function(behaviorFn, args) {
    var thisQuestion = this.getPathData();
    thisQuestion.set('responseText' , this.getLabel() );
    return behaviorFn.resume();
})

var submitBtn = Facade.Components.Button.forName('submit');
//Only show submit button if not already submitted
submitBtn.setMask(function() {
    if (inSubmitMode) {
        return Facade.Constants.Mask.HIDDEN;
    }
    return Facade.Constants.Mask.NORMAL;
});
submitBtn.setEnabled(function() {
    return !read_only;
});
submitBtn.setLabel(function() {
    if (read_only) {
        return "READ ONLY";
    } else {
        return "Submit Survey";
    }
});
//Submit the survey if it is completed
submitBtn.setOnClick(function() {

    //Validate that survey is complete
    var validation = Facade.FunctionRegistry.execute('validateSurvey');
    //do not submit if all questions not answered

    //If validation is succesful, transition the survey
    if(validation.success){
        Facade.PageRegistry.save().then(function() {
            Facade.PageRegistry.transition("wf_submit").then(function() {
                Facade.PageRegistry.alert("Your survey has been submitted. Thank you! ");
                inSubmitMode = true;
            });
        })
    } else {
        Facade.PageRegistry.alert("Must answer all questions. \n You have not answered the following questions: \n " + validation.msg);
    }
});

//Return string indicating unanswered questions or return undefined if survey
//has been validated successfullys
Facade.FunctionRegistry.register('validateSurvey', function() {
    var unAnsweredQuestions = new String;
    var responseList = Facade.PageRegistry.getPrimaryData().get('responseList');
    var len = responseList.getLength();
    for (var i = 0; i < len; i++) {
        var answer = responseList.get(i).get('responseText');
        if (!answer) {
            var index = i + 1;
            unAnsweredQuestions += index + ",";
        }
    }
    unAnsweredQuestions = unAnsweredQuestions.slice(0, -1);
    //return unAnsweredQuestions != "" ? unAnsweredQuestions : undefined;
    return unAnsweredQuestions == '' ? { success : true } : { success : false , msg : unAnsweredQuestions };
});

/////////////////////////////////////////////////////////////////////////////////////

// show if questionText is A
Facade.Components.Field.forName("radioSetField").setMask(function(behaviorFn, args) {

    var questionText = this.getPathData().get('questionType');
    if ((questionText === "BOOL" || questionText == "CHOICE") && (!inSubmitMode)) {
        return Facade.Constants.Mask.NORMAL;
    }
    return Facade.Constants.Mask.HIDDEN;
});

//Only show radio button if there is an answer option
Facade.Components.Radio.forKind('radiobtn').setMask(function(behaviorFn, args) {

    var field = this.getPathData();
    var opts = field.get('answerOptions');
    var questionText = field.get('questionType');
    var index = this.getValue().data;
    if (questionText == 'BOOL') {
        if (index < 2) {
            return Facade.Constants.Mask.NORMAL;
        }
    }

    if ( opts && opts.get(index) && (!inSubmitMode)) {
        return Facade.Constants.Mask.NORMAL;
    }
    return Facade.Constants.Mask.HIDDEN;

});

//Set radio button label to answer option
Facade.FunctionRegistry.register("page.radiobtn.setLabel", function(behaviorFn, args) {
    var field = this.getPathData();
    var label = field.get('answerOptions');
    var questionText = field.get('questionType');
    var index = this.getValue().data;
    if (questionText == "BOOL") {
        if (index == 0) {
            return 'yes';
        }
        if (index == 1) {
            return 'no';
        }
        return null;
    }
    if (label.get(index)) {
        return label.get(index).get('answerText');
    }
    return null;
});

// show if questionText is A
Facade.Components.Field.forName("checkboxSet").setMask(function(behaviorFn, args) {

    var questionText = this.getPathData().get('questionType');
    if (questionText == "SELECT" && (!inSubmitMode)) {
        return Facade.Constants.Mask.NORMAL;
    }
    return Facade.Constants.Mask.HIDDEN;
});

Facade.Components.Radio.forKind('answerCheckbox').setMask(function(behaviorFn, args) {
    var field = this.getPathData();
    var opts = field.get('answerOptions');
    var index = this.getItemSelectionName();

    return opts.get(index) ? Facade.Constants.Mask.NORMAL : Facade.Constants.Mask.HIDDEN;
});

//On click of checkbox, add answer to responseList. Answers separated by |&| symbol
Facade.Components.Checkbox.forKind('answerCheckbox').setOnClick(function(behaviorFn, args) {
    var field = this.getPathData();
    var label = field.get('answerOptions');
    var index = this.getItemSelectionName();

    //Have answer to add
    var answerToAdd = label.get(index).get('answerText');

    //Add answer
    if (!this.getChecked()) {

        if (this.getPathData().get('responseText')) {
            var answer = this.getPathData().get('responseText') + "|&|" + answerToAdd;
            this.getPathData().set('responseText', new Facade.Prototypes.Data(answer));
        } else {
            this.getPathData().set('responseText', new Facade.Prototypes.Data("|&|" + answerToAdd));
        }
    }
    //Remove answerToAdd
    else {
        var currentAnswer = this.getPathData().get('responseText');
        if (currentAnswer) {
            if (currentAnswer.indexOf('|&|') > -1) {
                answerToAdd = "|&|" + answerToAdd;
            }
            if (currentAnswer.indexOf(answerToAdd) > -1) {
                currentAnswer = currentAnswer.replace(answerToAdd, "");
            }
            this.getPathData().set('responseText', new Facade.Prototypes.Data(currentAnswer));
        }
    }
    return behaviorFn.resume();
});

//Set up labels for checkbox for each answer options
Facade.FunctionRegistry.register("page.checkbox.setLabel", function(behaviorFn, args) {
    var field = this.getPathData();
    var label = field.get('answerOptions');
    var index = this.getItemSelectionName();
    return label.get(index) ? label.get(index).get('answerText') : null;
});

//Show responseText if its a fill in question or open response question
Facade.FunctionRegistry.register("page.responseText.setMask", function(behaviorFn, args) {
    var questionType = this.getPathData().getParentPathData().get('questionType');
    if ((questionType == "FIB" || questionType == "OPEN") && (!inSubmitMode)) {
        return Facade.Constants.Mask.NORMAL;
    }
    return Facade.Constants.Mask.HIDDEN;
});

//Replace |&| separator with commas to better display submitted answers
Facade.FunctionRegistry.register('getSubmittedAnswerText', function(behaviorFn, args) {
    var answer = this.getPathData().get('responseText');
    if (answer) {
        while (answer.indexOf('|&|') > -1) {
            answer = answer.replace('|&|', ',');
        }
        if (answer[0] == ",") {
            answer = answer.slice(1);
        }
    }
    return answer;
});

Facade.FunctionRegistry.register('surveyStateTopText' , function(){
    var data = Facade.PageRegistry.getPrimaryData();
    return data.get('state') == 'completed' ? 'Survey Completed by: ' : 'Survey to be filled out by: ';
})

//Return normal if in submit mode, hidden if not
Facade.FunctionRegistry.register('inSubmitMode', function() {
    return inSubmitMode ? Facade.Constants.Mask.NORMAL : Facade.Constants.Mask.HIDDEN;
});

//Return 5 if open response, and 1 if fill not for height of textbox
Facade.FunctionRegistry.register('getFieldHeight', function() {
    var questionType = this.getPathData().getParentPathData().get('questionType');
    return questionType == "OPEN" ? 5 : 1;
});


Facade.Components.Field.forName('dateCompleted').setData( function() {
    var dateCompleted = Facade.PageRegistry.getPrimaryData().get('dateCompleted');
    if( dateCompleted ){
        return Facade.Prototypes.Data( dateCompleted );
    }
    return new Facade.Prototypes.Data("Not Completed");
});

Facade.Components.Field.forName('dateAssigned').setData( function() {
    var dateAssigned = Facade.PageRegistry.getPrimaryData().get('dateAssigned');
    if( dateAssigned ){
        return Facade.Prototypes.Data( dateAssigned );
    }
    return new Facade.Prototypes.Data("Not Assigned");
});



